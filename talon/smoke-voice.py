#!/usr/bin/env python3
"""Real upstream voice UI/auth + browser RTC audio, with a local synthetic provider.

Requires Docker, Node 24 and playwright (Chromium installed). No API keys.
Never mounts existing data or publishes a non-loopback host port.
"""
from pathlib import Path
import subprocess
import sys
import time
import uuid

image = sys.argv[1]
name = 'talon-voice-' + uuid.uuid4().hex[:10]
root = Path(__file__).resolve().parent
try:
    subprocess.run(['docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::8080',
                    '-v', str(root / 'tests/voice-fixture.cjs') + ':/tmp/voice-fixture.cjs:ro',
                    '--entrypoint', 'node', image, '/tmp/voice-fixture.cjs'], check=True)
    for _ in range(120):
        logs = subprocess.check_output(['docker', 'logs', name], text=True, stderr=subprocess.STDOUT)
        if 'VOICE_FIXTURE_READY' in logs:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('Voice fixture did not start')
    port = subprocess.check_output(['docker', 'port', name, '8080/tcp'], text=True).strip().rsplit(':', 1)[1]
    subprocess.run(['node', str(root / 'tests/voice-browser.cjs'), 'http://127.0.0.1:' + port], check=True, timeout=120)
finally:
    subprocess.run(['docker', 'logs', name], check=False)
    subprocess.run(['docker', 'rm', '-f', name], check=False, stdout=subprocess.DEVNULL)
