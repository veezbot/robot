#!/usr/bin/env node
// Streams the Pi's veezbot service logs, reconnecting every 3s if the Pi is unreachable.
// Pure JS retry loop (no shell `while` loop) so it also works on Windows via concurrently/cmd.exe.
import { ssh } from './pi.mjs';

for (;;) {
  await ssh('journalctl -f -u veezbot -n 20 --no-pager', { connectTimeout: 5 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
