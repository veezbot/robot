#!/usr/bin/env node
// Run FROM dev machine. Installs veezbot as a systemd service on the Pi.
// Usage: node scripts/remote-install-service.mjs  (or: pnpm install:service)
import { join } from 'node:path';
import { scp, ssh, remote, SCRIPTS_DIR, PI_DIR } from './pi.mjs';

console.log('==> Uploading install-service.sh to Pi...');
await scp([join(SCRIPTS_DIR, 'install-service.sh'), remote('/tmp/veezbot-install-service.sh')]);

console.log('==> Running install-service.sh on Pi...');
await ssh(
  `export NVM_DIR=$HOME/.nvm; [ -s $NVM_DIR/nvm.sh ] && source $NVM_DIR/nvm.sh; ROBOT_DIR=${PI_DIR} bash /tmp/veezbot-install-service.sh`,
);

console.log('==> Done.');
