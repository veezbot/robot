#!/usr/bin/env node
// Run FROM dev machine. Copies the custom ffmpeg-whip binary to the Pi.
// Usage: node scripts/remote-deploy-ffmpeg.mjs  (or: pnpm deploy:ffmpeg)
// Assumes passwordless sudo on the Pi (same assumption as remote-deploy-dist.mjs).
import { join } from 'node:path';
import { scp, ssh, remote, ROBOT_DIR } from './pi.mjs';

const FFMPEG_BIN = join(ROBOT_DIR, 'ffmpeg', 'bin', 'ffmpeg');

console.log('==> Pushing ffmpeg-whip to Pi...');
await scp([FFMPEG_BIN, remote('/tmp/ffmpeg-whip')]);
await ssh('sudo mv /tmp/ffmpeg-whip /usr/local/bin/ffmpeg-whip && sudo chmod +x /usr/local/bin/ffmpeg-whip');

console.log('==> Done.');
