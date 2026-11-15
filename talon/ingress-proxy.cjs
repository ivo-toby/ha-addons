'use strict';

// Only Supervisor may reach this gateway. Never trust a forwarded client IP.
const http = require('node:http');
const net = require('node:net');
const { isIP } = net;

function trustedIngressPeers(value = process.env.TALON_INGRESS_GATEWAYS) {
  const peers = (value || '172.30.32.2').split(',').map(s => s.trim()).filter(Boolean);
  if (!peers.length || peers.some(peer => isIP(peer) === 0)) {
    throw new Error('TALON_INGRESS_GATEWAYS must contain valid comma-separated IP addresses');
  }
  return new Set(peers);
}

function normalizePeer(address) {
  return (address || '').replace(/^::ffff:/, '');
}

function ingressPath(req) {
  const prefix = req.headers['x-ingress-path'] || '';
  if (prefix !== '' && !/^\/api\/hassio_ingress\/[A-Za-z0-9_-]+$/.test(prefix)) {
    throw new Error('Invalid ingress path');
  }
  return prefix;
}

function route(url) {
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
    throw new Error('Invalid request target');
  }
  const path = url.split('?')[0];
  const voice = path === '/voice' || path.startsWith('/voice/');
  const terminal = path === '/terminal' || path.startsWith('/terminal/');
  return { voice, terminal, path: terminal ? url.slice('/terminal'.length) || '/' : url };
}

function cleanHeaders(source) {
  const headers = { ...source };
  const connection = String(headers.connection || '').split(',').map(x => x.trim().toLowerCase());
  for (const name of [...connection, 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']) delete headers[name];
  return headers;
}

function requestHeaders(req, target, prefix, upgrade = false) {
  const headers = cleanHeaders(req.headers);
  if (target.terminal) headers['x-ingress-path'] = prefix + '/terminal';
  if (target.voice) {
    // HA Core sets these before Supervisor forwards the authenticated request.
    // Preserve Origin for upstream's independent origin/CSRF checks.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (typeof host !== 'string' || !host || /[\s,/@\\]/.test(host)) throw new Error('Invalid public host');
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim().toLowerCase();
    if (proto !== 'https' && proto !== 'http') throw new Error('Invalid public protocol');
    headers.host = host;
    headers['x-forwarded-proto'] = proto;
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-for'];
  }
  if (upgrade) {
    headers.connection = 'Upgrade';
    headers.upgrade = req.headers.upgrade;
  }
  return headers;
}

function responseHeaders(source, voice, prefix) {
  const headers = cleanHeaders(source);
  if (voice) {
    // HA embeds ingress in a same-origin iframe. Keep all other CSP directives.
    headers['x-frame-options'] = 'SAMEORIGIN';
    if (headers['content-security-policy']) {
      headers['content-security-policy'] = headers['content-security-policy'].replace(
        /frame-ancestors 'none'/, "frame-ancestors 'self'");
    }
  }
  if (voice && headers['set-cookie']) {
    // Scope both HttpOnly login and readable CSRF cookies to this add-on.
    headers['set-cookie'] = headers['set-cookie'].map(cookie =>
      cookie.replace(/;\s*Path=\/\s*(?=;|$)/i, '; Path=' + prefix + '/voice/'));
  }
  return headers;
}

const HOME = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Talon</title>
<style>body{font:18px system-ui;background:#101820;color:#eee;max-width:640px;margin:12vh auto;padding:24px}a{display:block;padding:20px;margin:16px 0;background:#20414b;color:white;border-radius:12px;text-decoration:none}small{color:#bacbd0}</style>
<h1>Talon</h1><a href="./voice/">Voice — talk to Talon</a>
<a href="./terminal/">Management &amp; recovery terminal</a>
<small>Voice requires a configured persona and live-provider API key, HTTPS and microphone permission.</small>
<p><a href="./voice/" target="_blank" rel="noopener">Open voice in a new browser tab</a></p></html>`;

function createIngressProxy({ peers = trustedIngressPeers(), log = console,
  terminalPort = 7682, voicePort = 8787 } = {}) {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    let target, prefix, headers;
    try {
      prefix = ingressPath(req);
      target = route(req.url);
      headers = requestHeaders(req, target, prefix);
    } catch {
      res.writeHead(400); res.end('Invalid ingress request'); return;
    }
    const pathname = req.url.split('?')[0];
    if (pathname === '/voice' || pathname === '/terminal') {
      res.writeHead(302, { location: prefix + pathname + '/', 'cache-control': 'no-store' }); res.end(); return;
    }
    if (pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : HOME); return;
    }
    const upstream = http.request({ hostname: '127.0.0.1', port: target.voice ? voicePort : terminalPort,
      path: target.path, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, responseHeaders(response.headers, target.voice, prefix));
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    req.on('aborted', () => upstream.destroy());
    req.on('error', () => upstream.destroy());
    res.on('error', () => upstream.destroy());
    res.on('close', () => upstream.destroy());
    upstream.on('error', () => {
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(target.voice ? 'Voice is unavailable. Configure voice.enabled, host 127.0.0.1 and port 8787 in talond.yaml, then restart Talon.' : 'Terminal unavailable');
    });
    req.pipe(upstream);
  });
  // Reject at connection time, including incomplete or malformed HTTP requests.
  server.on('connection', socket => {
    const peer = normalizePeer(socket.remoteAddress);
    if (!peers.has(peer)) {
      log.warn('[talon] ingress: rejected connection from ' + (peer || 'unknown'));
      socket.destroy(); return;
    }
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (req, socket, head) => {
    let target, headers;
    try {
      target = route(req.url);
      headers = requestHeaders(req, target, ingressPath(req), true);
    } catch { socket.destroy(); return; }
    const upstream = net.connect(target.voice ? voicePort : terminalPort, '127.0.0.1');
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    upstream.on('close', () => socket.destroy());
    upstream.on('connect', () => {
      if (socket.destroyed) { upstream.destroy(); return; }
      let request = req.method + ' ' + target.path + ' HTTP/' + req.httpVersion + '\r\n';
      for (const [key, value] of Object.entries(headers)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item !== undefined) request += key + ': ' + item + '\r\n';
        }
      }
      upstream.write(request + '\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
  });
  // Node's closeAllConnections excludes upgraded sockets. Include those on stop.
  const closeConnections = server.closeAllConnections.bind(server);
  server.closeAllConnections = () => { closeConnections(); for (const socket of sockets) socket.destroy(); };
  return server;
}

if (require.main === module) {
  const listener = createIngressProxy();
  listener.on('error', error => {
    console.error('[talon] ingress: failed to start: ' + error.message);
    process.exitCode = 1;
  });
  listener.listen(7681, '0.0.0.0', () => console.info('[talon] ingress: terminal and voice gateway on 7681'));
}

module.exports = { normalizePeer, trustedIngressPeers, createIngressProxy };
