'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareVoiceWeb } = require('./prepare-voice-web.cjs');

test('build adaptation keeps assets and browser API within the actual ingress prefix', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'talon-voice-web-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  fs.writeFileSync(path.join(dir, 'index.html'), '<img src="/voice/assets/logo.png"><script src="/voice/app.js"></script>');
  fs.writeFileSync(path.join(dir, 'app.js'), 'const client = new VoiceBrowserClient({audioElement: audio});');
  prepareVoiceWeb(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), '<img src="./assets/logo.png"><script src="./app.js"></script>');
  const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.match(app, /apiBase: new URL\('\.', import.meta.url\).pathname/);
  for (const base of ['http://localhost/voice/', 'https://ha.test/api/hassio_ingress/rotated-session/voice/']) {
    assert.equal(new URL('./assets/logo.png', base).pathname, new URL(base).pathname + 'assets/logo.png');
    assert.equal(new URL('.', new URL('app.js', base)).pathname, new URL(base).pathname);
  }
  assert.throws(() => prepareVoiceWeb(dir), /Pinned voice UI changed/);
});
