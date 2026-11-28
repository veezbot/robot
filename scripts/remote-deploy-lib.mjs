#!/usr/bin/env node
// Run FROM dev machine. Syncs lib/dist/ to the Pi only — no restart.
// Skips gracefully if Pi is offline.
// Usage: node scripts/remote-deploy-lib.mjs
import { join } from 'node:path';
import { isPiOnline, syncDir, ROBOT_DIR, PI_DIR } from './pi.mjs';

if (!(await isPiOnline())) {
  console.log('==> Pi offline, skipping lib sync.');
  process.exit(0);
}

console.log('==> Syncing lib/dist/...');
await syncDir(join(ROBOT_DIR, 'lib', 'dist'), `${PI_DIR}/lib/dist`);

console.log('==> Done.');
