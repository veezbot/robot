#!/usr/bin/env node
// Run FROM dev machine. Syncs dist/ to the Pi and signals a restart.
// Skips gracefully if Pi is offline.
// Usage: node scripts/remote-deploy-dist.mjs  (or: pnpm deploy:dist)
import { join } from 'node:path';
import { isPiOnline, ssh, scp, syncDir, remote, ROBOT_DIR, PI_DIR } from './pi.mjs';

if (!(await isPiOnline())) {
  console.log('==> Pi offline, skipping deploy.');
  process.exit(0);
}

console.log('==> Stopping app on Pi...');
await ssh("sudo systemctl stop veezbot 2>/dev/null || sudo pkill -f '[n]ode.*dist/main.js' || true").catch(() => {});

const hasNodeModules = await ssh(`[ -d ${PI_DIR}/node_modules ]`, { silent: true })
  .then(() => true)
  .catch(() => false);

if (!hasNodeModules) {
  console.log('==> First deploy: syncing package files...');
  await scp([
    join(ROBOT_DIR, 'package.json'),
    join(ROBOT_DIR, 'pnpm-lock.yaml'),
    join(ROBOT_DIR, 'pnpm-workspace.yaml'),
    remote(`${PI_DIR}/`),
  ]);
  await ssh(`mkdir -p ${PI_DIR}/lib`);
  await scp([join(ROBOT_DIR, 'lib', 'package.json'), remote(`${PI_DIR}/lib/`)]);

  console.log('==> Installing dependencies on Pi...');
  await ssh(
    `export NVM_DIR=$HOME/.nvm; [ -s $NVM_DIR/nvm.sh ] && source $NVM_DIR/nvm.sh; export PATH=$HOME/.local/share/pnpm:$PATH; cd ${PI_DIR} && pnpm install --frozen-lockfile && npm rebuild pigpio i2c-bus --prefix .`,
  );
}

console.log('==> Syncing lib/dist/...');
await syncDir(join(ROBOT_DIR, 'lib', 'dist'), `${PI_DIR}/lib/dist`);

console.log('==> Syncing dist/...');
await syncDir(join(ROBOT_DIR, 'dist'), `${PI_DIR}/dist`);

console.log('==> Waiting for port 8888 to clear...');
await ssh("sudo fuser -k 8888/tcp 2>/dev/null || true; while sudo ss -tlnp | grep -q ':8888'; do sleep 0.2; done").catch(() => {});

const { TOKEN, SERVER_URL } = process.env;
if (TOKEN && SERVER_URL) {
  console.log('==> Writing /boot/veezbot.config.json...');
  await ssh(`printf '{"token":"%s","serverUrl":"%s"}\\n' "${TOKEN}" "${SERVER_URL}" | sudo tee /boot/veezbot.config.json > /dev/null`);
}

console.log('==> Starting app on Pi...');
await ssh('sudo systemctl start veezbot 2>/dev/null || true').catch(() => {});

console.log('==> Done.');
