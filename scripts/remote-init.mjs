#!/usr/bin/env node
// Run FROM dev machine. SSH into the Pi and executes init.sh.
// Usage: node scripts/remote-init.mjs  (or: pnpm init:pi)
import { join } from 'node:path';
import { scp, ssh, remote, SCRIPTS_DIR } from './pi.mjs';

console.log('==> Uploading init.sh to Pi...');
await scp([join(SCRIPTS_DIR, 'init.sh'), remote('/tmp/veezbot-init.sh')]);

console.log('==> Running init.sh on Pi...');
await ssh('bash /tmp/veezbot-init.sh');

console.log('==> Done.');
