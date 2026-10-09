'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Supervisor considers any nonempty Config.Healthcheck a readiness check;
// Docker's explicit NONE object therefore waits for a nonexistent health event.
// The image smoke test verifies actual metadata, including inherited settings.
for (const name of ['Dockerfile', 'Dockerfile.source']) {
  test(`${name} does not emit disabled-healthcheck metadata`, () => {
    const contents = fs.readFileSync(path.join(__dirname, name), 'utf8');
    assert.doesNotMatch(contents, /^\s*HEALTHCHECK\s+NONE\s*$/mi);
  });
}

test('daemon launcher execs via setpriv without runuser session timeout', () => {
  const script = fs.readFileSync(path.join(__dirname, 'run.sh'), 'utf8');
  assert.match(script, /^setsid setpriv --reuid=talond --regid=talond --init-groups -- env HOME=\/home\/talond USER=talond LOGNAME=talond node \/opt\/talond\/dist\/index\.js --config "\$CONFIG_FILE" &$/m);
  assert.doesNotMatch(script, /^setsid runuser .*node \/opt\/talond\/dist\/index\.js/m);
  assert.match(script, /kill -TERM "\-\$DAEMON_PID"/);
  assert.match(script, /wait "\$DAEMON_PID"/);
});

test('HA stop cleanly exits and terminal is an exec-style process group', () => {
  const script = fs.readFileSync(path.join(__dirname, 'run.sh'), 'utf8');
  assert.match(script, /^trap 'cleanup; exit 0' INT TERM$/m);
  assert.match(script, /^setsid setpriv --reuid=talond --regid=talond --init-groups -- env HOME=\/home\/talond USER=talond LOGNAME=talond \/usr\/local\/bin\/ttyd .* &$/m);
  assert.match(script, /\/bin\/bash --noprofile --rcfile \/home\/talond\/\.bashrc -i &/);
  assert.match(script, /-p 7682 -- \/bin\/bash --noprofile/);
  assert.doesNotMatch(script, /^runuser -u talond -- .*ttyd/m);
  assert.match(script, /kill -TERM "-\$TTYD_PID"/);
  assert.match(script, /wait "\$TTYD_PID"/);
});

test('existing CLI IPC directory enters recovery mode instead of terminating the add-on', () => {
  const script = fs.readFileSync(path.join(__dirname, 'run.sh'), 'utf8');
  assert.match(script, /Existing IPC directory requires manual migration:.*entering recovery mode/);
  assert.match(script, /elif \[ -e "\$CLI_IPC_DIR" \]; then\n[^\n]*\n  CONFIG_VALID=0/);
  assert.match(script, /if \[ ! -f "\$CONFIG_FILE" \] \|\| \[ "\$CONFIG_VALID" -ne 1 \]; then/);
});

test('ingress proxy runs unprivileged and is restarted without restarting Talon', () => {
  const script = fs.readFileSync(path.join(__dirname, 'run.sh'), 'utf8');
  assert.match(script, /proxy_supervisor\(\) \(/);
  assert.match(script, /setpriv --reuid=talond --regid=talond --init-groups -- node \/usr\/local\/lib\/talon-ingress-proxy\.cjs &/);
  assert.doesNotMatch(script, /^node \/usr\/local\/lib\/talon-ingress-proxy\.cjs &$/m);
  assert.match(script, /wait "\$proxy_child"/);
  assert.match(script, /restarting in 2 seconds/);
  assert.match(script, /sleep 2 &/);
  assert.match(script, /trap proxy_stop INT TERM EXIT/);
  assert.match(script, /kill -TERM "\$PROXY_PID"/);
  assert.match(script, /wait "\$PROXY_PID"/);
});
