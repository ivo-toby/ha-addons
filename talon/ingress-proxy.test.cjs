'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { normalizePeer, trustedIngressPeers, createIngressProxy } = require('./ingress-proxy.cjs');

test('only configured ingress gateway addresses are trusted', () => {
  assert.deepEqual([...trustedIngressPeers('172.30.32.2, 10.10.10.1')], ['172.30.32.2', '10.10.10.1']);
  assert.deepEqual([...trustedIngressPeers('')], ['172.30.32.2']);
  assert.throws(() => trustedIngressPeers('172.30.0.0/16'), /valid comma-separated/);
  assert.equal(normalizePeer('::ffff:172.30.32.2'), '172.30.32.2');
});

test('untrusted TCP connections are rejected before reaching ttyd', async () => {
  const rejected = [];
  const server = createIngressProxy({ peers: new Set(['192.0.2.9']), log: { warn: message => rejected.push(message) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await new Promise(resolve => {
      const connection = net.connect(server.address().port, '127.0.0.1');
      connection.on('error', resolve);
      connection.on('close', resolve);
      connection.on('connect', () => connection.write('GET / HTTP/1.1\r\n\r\n'));
    });
    assert.match(rejected.join('\n'), /rejected connection from 127\.0\.0\.1/);
  } finally {
    server.close();
  }
});

const http = require('node:http');
async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}
function cleanup(t, server) {
  const sockets = new Set();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });
}
function request(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, ...options }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', data => body += data);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(options.body);
  });
}
async function fixture(t, handler) {
  const backend = http.createServer(handler);
  const port = await listen(backend);
  cleanup(t, backend);
  const gateway = createIngressProxy({ peers: new Set(['127.0.0.1']), terminalPort: port, voicePort: port });
  const gatewayPort = await listen(gateway);
  cleanup(t, gateway);
  return { backend, port: gatewayPort };
}
const prefix = '/api/hassio_ingress/session-one';
const ingressHeaders = { 'x-ingress-path': prefix, host: 'supervisor.internal',
  'x-forwarded-host': 'ha.example.test:8123', 'x-forwarded-proto': 'https', origin: 'https://ha.example.test:8123' };

test('rejects untrusted peers before any HTTP bytes arrive', { timeout: 2000 }, async t => {
  const gateway = createIngressProxy({ peers: new Set(['192.0.2.9']), log: { warn() {} } });
  const port = await listen(gateway);
  cleanup(t, gateway);
  await new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.on('close', resolve);
    socket.on('error', reject);
  });
});

test('landing page links to voice and terminal under the current prefix', async t => {
  const { port } = await fixture(t, () => assert.fail('landing page must not reach backend'));
  const res = await request(port, '/', { headers: ingressHeaders });
  assert.equal(res.status, 200);
  assert.match(res.body, /href="\.\/voice\/"/);
  assert.match(res.body, /href="\.\/terminal\/"/);
  for (const path of ['/voice', '/terminal']) {
    const redirect = await request(port, path, { headers: ingressHeaders });
    assert.equal(redirect.headers.location, prefix + path + '/');
  }
});

test('terminal HTTP keeps ttyd ingress base and forwards methods and bodies', async t => {
  const { port } = await fixture(t, (req, res) => {
    assert.equal(req.url, '/token?q=1');
    assert.equal(req.headers['x-ingress-path'], prefix + '/terminal');
    assert.equal(req.method, 'POST');
    let body = '';
    req.on('data', data => body += data);
    req.on('end', () => { res.writeHead(201); res.end(body); });
  });
  const res = await request(port, '/terminal/token?q=1', { method: 'POST', headers: ingressHeaders, body: 'terminal body' });
  assert.equal(res.status, 201);
  assert.equal(res.body, 'terminal body');
});

test('voice preserves actual public origin, streams bodies and scopes both cookies', async t => {
  const { port } = await fixture(t, (req, res) => {
    assert.equal(req.url, '/voice/login');
    assert.equal(req.headers.host, 'ha.example.test:8123');
    assert.equal(req.headers.origin, ingressHeaders.origin);
    assert.equal(req.headers['x-forwarded-proto'], 'https');
    assert.equal(req.headers['x-forwarded-for'], undefined);
    res.writeHead(200, { 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'set-cookie': [
      'talon_voice_session=session; Path=/; HttpOnly; Secure; SameSite=Strict',
      'talon_voice_csrf=csrf; Path=/; Secure; SameSite=Strict',
    ] });
    req.pipe(res);
  });
  const result = await request(port, '/voice/login', { method: 'POST', headers: ingressHeaders, body: '{"token":"fixture"}' });
  assert.equal(result.status, 200);
  assert.equal(result.body, '{"token":"fixture"}');
  assert.equal(result.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(result.headers['content-security-policy'], "default-src 'self'; frame-ancestors 'self'");
  assert.equal(result.headers['set-cookie'].length, 2);
  assert.match(result.headers['set-cookie'][0], /Path=\/api\/hassio_ingress\/session-one\/voice\/; HttpOnly; Secure/);
  assert.match(result.headers['set-cookie'][1], /Path=\/api\/hassio_ingress\/session-one\/voice\/; Secure/);
});

test('bad request targets and prefixes return 400 without crashing the server', async t => {
  const { port } = await fixture(t, (req, res) => res.end(req.url));
  for (const path of ['//other-host/voice/', '/voice/\\bad']) {
    assert.equal((await request(port, path)).status, 400);
  }
  assert.equal((await request(port, '/voice/', { headers: { 'x-ingress-path': '//evil.test' } })).status, 400);
  assert.equal((await request(port, '/voiceevil')).body, '/voiceevil');
  assert.equal((await request(port, '/')).status, 200);
});

test('SSE arrives immediately and closing the client closes the upstream stream', { timeout: 3000 }, async t => {
  let disconnected;
  const closed = new Promise(resolve => disconnected = resolve);
  const { port } = await fixture(t, (req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('data: first\n\n');
    res.on('close', disconnected);
  });
  await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/voice/sessions/test/events', headers: ingressHeaders }, res => {
      res.once('data', chunk => {
        assert.match(chunk.toString(), /data: first/);
        res.destroy(); resolve();
      });
    });
    req.on('error', reject);
  });
  await closed;
});

test('terminal WebSocket handshake and early frames survive the gateway', { timeout: 3000 }, async t => {
  const { port, backend } = await fixture(t, () => assert.fail('must upgrade'));
  backend.on('upgrade', (req, socket, head) => {
    assert.equal(req.url, '/ws');
    assert.equal(req.headers['x-ingress-path'], prefix + '/terminal');
    assert.equal(req.headers['sec-websocket-protocol'], 'tty');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
    if (head.length) socket.write(head);
    socket.on('data', data => socket.write(data));
  });
  await new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    let response = '';
    socket.on('error', reject);
    socket.on('connect', () => socket.write('GET /terminal/ws HTTP/1.1\r\nHost: local\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Protocol: tty\r\nX-Ingress-Path: ' + prefix + '\r\n\r\nearly-frame'));
    socket.on('data', data => {
      response += data.toString();
      if (response.includes('early-frame')) {
        assert.match(response, /101 Switching Protocols/);
        socket.destroy(); resolve();
      }
    });
  });
});
