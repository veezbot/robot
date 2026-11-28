#!/usr/bin/env node
// Run FROM dev machine. Watches robot/ for changes, deploys and restarts on Pi.
// Usage: node scripts/remote-dev.mjs  (or: pnpm dev:remote)
import concurrently from 'concurrently';
import { join } from 'node:path';
import { ROBOT_DIR, SCRIPTS_DIR } from './pi.mjs';

const deployLib = `node "${join(SCRIPTS_DIR, 'remote-deploy-lib.mjs')}"`;
const deployDist = `node "${join(SCRIPTS_DIR, 'remote-deploy-dist.mjs')}"`;
const tailLogs = `node "${join(SCRIPTS_DIR, 'tail-pi-logs.mjs')}"`;

const { result } = concurrently(
  [
    // Watch lib/ → build lib/dist/ locally → sync lib/dist only (no restart — robot watcher handles restart)
    { command: `pnpm exec tsup --watch --onSuccess "${deployLib}"`, name: 'lib', cwd: join(ROBOT_DIR, 'lib') },
    // Watch robot/ → build dist/ locally → sync + restart on Pi
    { command: `pnpm exec tsc-watch --onSuccess "${deployDist}"`, name: 'robot', cwd: ROBOT_DIR },
    // Stream Pi logs in real-time (follows across restarts)
    { command: tailLogs, name: 'pi', cwd: ROBOT_DIR },
  ],
  { prefix: 'name' },
);

result.catch(() => process.exit(1));
