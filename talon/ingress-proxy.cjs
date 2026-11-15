'use strict';

// Authenticated Home Assistant ingress gateway. Only the Supervisor ingress
// gateway may connect; no other add-on gets direct terminal or voice access.
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
function targetFor(url) {
  const pathname = new URL(url || '/', 'http://localhost').pathname;
  // Strict prefix match prevents /voiceevil from being sent to the voice server.
  return pathname === '/voice' || pathname.startsWith('/voice/')
    ? {port: 8787, voice: true} : {port: 7682, voice: false};
}
function authorized(socket, peers, log) {
  const peer = normalizePeer(socket.remoteAddress);
  if (peers.has(peer)) return true;
  log.warn('[talon] ingress: rejected connection from ' + (peer || 'unknown'));
  socket.destroy();
  return false;
}
function requestHeaders(req, voice) {
  const headers = {...req.headers};
  if (voice) {
    // The HA ingress gateway is trusted; forwarded client-provided headers
    // are not. Only the gateway's actual Host/Origin are passed through.
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-for'];
    headers['x-forwarded-proto'] = 'https';
  }
  return headers;
}
function createIngressProxy({peers = trustedIngressPeers(), log = console} = {}) {
  const server = http.createServer((req, res) => {
    if (!authorized(req.socket, peers, log)) return;
    const target = targetFor(req.url);
    const upstream = http.request({
      hostname: '127.0.0.1', port: target.port, method: req.method,
      path: req.url, headers: requestHeaders(req, target.voice),
    }, response => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.pipe(res);
    });
    upstream.on('error', error => {
      log.warn('[talon] ingress upstream unavailable: ' + error.code);
      if (!res.headersSent) res.writeHead(502);
      res.end('Upstream unavailable');
    });
    req.pipe(upstream);
  });
  server.on('upgrade', (req, socket, head) => {
    if (!authorized(socket, peers, log)) return;
    const target = targetFor(req.url);
    const upstream = net.connect(target.port, '127.0.0.1');
    upstream.on('connect', () => {
      let header = req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n';
      const headers = requestHeaders(req, target.voice);
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) for (const item of value) header += key + ': ' + item + '\r\n';
        else if (value !== undefined) header += key + ': ' + value + '\r\n';
      }
      upstream.write(header + '\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
  });
  return server;
}
if (require.main === module) {
  const peers = trustedIngressPeers();
  const listener = createIngressProxy({peers});
  listener.on('error', error => {
    console.error('[talon] ingress: failed to start: ' + error.message);
    process.exitCode = 1;
  });
  listener.listen(7681, '0.0.0.0', () => {
    console.info('[talon] ingress: authenticated terminal + optional /voice/ on 7681');
  });
}
module.exports = {normalizePeer, trustedIngressPeers, createIngressProxy, targetFor};
