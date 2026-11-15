'use strict';
// Adapt the pinned upstream web UI at image build time. API and auth stay upstream.
const fs = require('node:fs');
const path = require('node:path');
function prepareVoiceWeb(directory) {
  const indexPath = path.join(directory, 'index.html');
  const appPath = path.join(directory, 'app.js');
  const index = fs.readFileSync(indexPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  if (!index.includes('"/voice/') || !app.includes('new VoiceBrowserClient({')) {
    throw new Error('Pinned voice UI changed; review the ingress adaptation');
  }
  fs.writeFileSync(indexPath, index.replaceAll('"/voice/', '"./'));
  fs.writeFileSync(appPath, app.replace('new VoiceBrowserClient({',
    "new VoiceBrowserClient({\n  apiBase: new URL('.', import.meta.url).pathname,"));
}
if (require.main === module) prepareVoiceWeb(process.argv[2]);
module.exports = { prepareVoiceWeb };
