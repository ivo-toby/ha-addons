'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.argv[2];
const prefix = '/api/hassio_ingress/test-session';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.TALON_TEST_CHROMIUM || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const context = await browser.newContext({ permissions: ['microphone'] });
    await context.addCookies([{ name: 'ha_session', value: 'fixture', url: origin }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    const requests = [];
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.goto(origin + '/fixture');
    const frame = page.frameLocator('iframe');
    await frame.getByRole('link', { name: 'Voice — talk to Talon', exact: true }).click();
    await frame.locator('#access-token').fill('fixture-voice-token');
    await frame.locator('[data-form="login"] button[type="submit"]').click();
    await frame.locator('[data-screen="call"]:not([hidden])').waitFor();
    const cookies = await context.cookies();
    for (const name of ['talon_voice_session', 'talon_voice_csrf']) {
      const cookie = cookies.find(cookie => cookie.name === name);
      assert.ok(cookie, name + ' missing');
      assert.equal(cookie.path, prefix + '/voice/');
      assert.equal(cookie.httpOnly, name === 'talon_voice_session');
    }
    console.log('PASS real voice UI login and path-scoped cookies inside HA-style iframe');
    const voiceFrame = page.frames().find(frame => frame.url().includes(prefix + '/voice/'));
    // Check actual upstream origin/CSRF boundary, not a mock proxy response.
    assert.equal(await voiceFrame.evaluate(async () => (await fetch('./logout', { method: 'POST' })).status), 403);
    const cookieHeader = cookies.map(c => c.name + '=' + c.value).join('; ');
    const denied = await fetch(origin + prefix + '/voice/login', { method: 'POST',
      headers: { cookie: cookieHeader, origin: 'https://other.example', 'content-type': 'application/json' },
      body: JSON.stringify({ accessToken: 'fixture-voice-token' }) });
    assert.equal(denied.status, 403);
    const secure = await fetch(origin + prefix + '/voice/login', { method: 'POST',
      headers: { cookie: cookieHeader, origin: origin.replace('http:', 'https:'),
        'x-forwarded-proto': 'https', 'content-type': 'application/json' },
      body: JSON.stringify({ accessToken: 'fixture-voice-token' }) });
    assert.equal(secure.status, 200);
    assert.ok(secure.headers.getSetCookie().every(cookie => /; Secure(?:;|$)/.test(cookie)));
    await voiceFrame.goto(voiceFrame.url());
    await frame.locator('[data-screen="call"]:not([hidden])').waitFor();
    console.log('PASS login restore, cross-origin denial and CSRF rejection');
    const peer = await context.newPage();
    await peer.goto(origin + '/peer');
    // Synthetic provider answers a real browser offer and returns synthetic audio.
    const answerPromise = peer.evaluate(async () => {
      let offer;
      for (let i = 0; i < 200; i++) {
        const response = await fetch('/offer');
        if (response.status === 200) { offer = await response.json(); break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!offer) throw new Error('No browser SDP offer reached the voice server');
      const pc = window.testPeer = new RTCPeerConnection();
      pc.ondatachannel = event => {
        window.testChannel = event.channel;
        const channel = event.channel;
        channel.onopen = () => channel.send(JSON.stringify({ type: 'session.started' }));
      };
      pc.ontrack = event => { window.receivedMicrophone = event.track; };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      if (pc.iceGatheringState !== 'complete') await new Promise(resolve => {
        pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') resolve(); });
      });
      await fetch('/answer', { method: 'POST', body: JSON.stringify({ sdp: pc.localDescription.sdp }) });
    });
    await frame.locator('[data-action="start"]').click();
    await answerPromise;
    try {
      await frame.locator('[data-role="phase-label"]').filter({ hasText: /^Connected$/ }).waitFor({ timeout: 20000 });
    } catch (error) {
      console.error('Voice UI:', await frame.locator('[data-screen="call"]').innerText());
      console.error('RTC peer:', await peer.evaluate(() => ({ connection: window.testPeer?.connectionState,
        ice: window.testPeer?.iceConnectionState, channel: window.testChannel?.readyState })));
      console.error('Page errors:', errors);
      throw error;
    }
    await peer.waitForFunction(async () => {
      const stats = await window.testPeer.getStats();
      const values = [...stats.values()];
      return values.some(s => s.type === 'inbound-rtp' && s.kind === 'audio' && s.bytesReceived > 0) &&
        values.some(s => s.type === 'outbound-rtp' && s.kind === 'audio' && s.bytesSent > 0);
    });
    const currentVoiceFrame = page.frames().find(frame => frame.url().includes(prefix + '/voice/'));
    await currentVoiceFrame.waitForFunction(() => {
      const audio = document.querySelector('#remote-audio');
      return audio.srcObject?.getAudioTracks().some(track => track.readyState === 'live') && !audio.paused;
    });
    assert.ok(requests.some(path => path === prefix + '/voice/sessions/fixture-call/events'));
    console.log('PASS microphone capture, real WebRTC audio in both directions, readiness and SSE through ingress');
    await frame.locator('[data-action="mute"]').click();
    assert.equal(await frame.locator('[data-action="mute"]').getAttribute('aria-pressed'), 'true');
    await frame.locator('[data-action="hangup"]').click();
    await frame.locator('[data-role="phase-label"]').filter({ hasText: /^Call ended$/ }).waitFor();
    await frame.locator('[data-action="logout"]').click();
    await frame.locator('[data-screen="login"]:not([hidden])').waitFor();
    assert.ok(requests.filter(path => path.includes('/voice/')).every(path => path.startsWith(prefix + '/voice/')));
    assert.deepEqual(errors, []);
    assert.equal((await context.cookies()).some(cookie => cookie.name === 'talon_voice_session'), false);
    console.log('PASS mute, hangup, logout and prefixed asset/API requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
