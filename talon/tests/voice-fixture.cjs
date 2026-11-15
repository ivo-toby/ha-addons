'use strict';
// Disposable fixture only. Never installed in the production image.
// Real upstream HTTP/auth/UI; the paid provider is replaced by a browser RTC peer.
const http = require('node:http');
const { createIngressProxy } = require('/usr/local/lib/talon-ingress-proxy.cjs');
const PREFIX = '/api/hassio_ingress/test-session';
const ok = value => ({ value, isErr: () => false });
(async () => {
  const { BrowserVoiceServer } = await import('/opt/talond/dist/voice/transports/browser/browser-server.js');
  let offer, answerResolve, record, ownerId;
  const listeners = new Set();
  function status() {
    return record ? { ...record, delegations: [], usage: { voiceCostStatus: 'unavailable', backendCostStatus: 'unavailable' }, finalization: { status: 'pending' } } : null;
  }
  const service = {
    async createSession(owner, input) {
      ownerId = owner.ownerId;
      offer = input.transport.sdp;
      const answer = await new Promise((resolve, reject) => {
        answerResolve = resolve;
        const timer = setTimeout(() => reject(new Error('RTC answer timeout')), 30000);
        timer.unref();
      });
      record = { id: 'fixture-call', status: 'connected', transport: 'webrtc', createdAt: Date.now(),
        startedAt: Date.now(), deadlineAt: Date.now() + 120000 };
      return ok({ session: record, client: { transport: 'webrtc', sessionId: record.id,
        providerSessionId: 'fixture-provider', answer: { type: 'webrtc', sdp: answer }, expiresAt: record.deadlineAt } });
    },
    status(owner) { return ok(ownerId === owner.ownerId ? status() : null); },
    subscribe(owner, id, handler) { listeners.add(handler); return ok(() => listeners.delete(handler)); },
    async closeSession() {
      record.status = 'closed'; record.closedAt = Date.now();
      for (const handler of listeners) handler({ kind: 'session', version: 1, session: status(), occurredAt: Date.now() });
      return ok({ session: record, pendingDelegation: false });
    },
    async reportPlayback() { return ok(undefined); },
  };
  const voice = new BrowserVoiceServer({ accessToken: 'fixture-voice-token',
    staticDirectory: '/opt/talond/dist/voice/web', heartbeatIntervalMs: 100 }, { sessionService: service });
  await voice.start('127.0.0.1', 8787);
  const gateway = createIngressProxy({ peers: new Set(['127.0.0.1']), voicePort: 8787 });
  await new Promise(resolve => gateway.listen(7681, '127.0.0.1', resolve));
  http.createServer(async (req, res) => {
    if (req.url === '/fixture') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<iframe title="HA ingress" src="' + PREFIX + '/" style="width:100%;height:95vh"></iframe>'); return;
    }
    if (req.url === '/peer') { res.end('<!doctype html><title>RTC test peer</title>'); return; }
    if (req.url === '/offer') {
      res.writeHead(offer ? 200 : 204, { 'content-type': 'application/json' });
      res.end(offer ? JSON.stringify({ sdp: offer }) : undefined); return;
    }
    if (req.url === '/answer' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      answerResolve(JSON.parse(body).sdp); res.end('ok'); return;
    }
    if (!req.url.startsWith(PREFIX + '/') || !String(req.headers.cookie).includes('ha_session=fixture')) {
      res.writeHead(401); res.end('HA session required'); return;
    }
    const headers = { ...req.headers, 'x-ingress-path': PREFIX,
      'x-forwarded-host': req.headers.host, 'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http' };
    delete headers.connection;
    const upstream = http.request({ host: '127.0.0.1', port: 7681, method: req.method,
      path: req.url.slice(PREFIX.length), headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  }).listen(8080, '0.0.0.0', () => console.log('VOICE_FIXTURE_READY'));
})().catch(error => { console.error(error); process.exit(1); });
