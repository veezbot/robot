#!/bin/bash
# Run FROM dev machine. Watches robot/ for changes, deploys and restarts on Pi.
# Usage: bash scripts/dev.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROBOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

prefix() { sed -u "s/^/[$1] /"; }

# 1. Watch lib/ → build lib/dist/ locally → sync lib/dist only (no restart — robot watcher handles restart)
(cd "$ROBOT_DIR/lib" && pnpm exec tsup --watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-lib.sh" 2>&1 | prefix lib) &

# 2. Watch robot/ → build dist/ locally → sync + restart on Pi
(cd "$ROBOT_DIR" && pnpm exec tsc-watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-dist.sh" 2>&1 | prefix robot) &

# 3. Stream Pi logs in real-time (follows across restarts)
(while true; do
  sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
    "$PI_USER@$PI_HOST" "journalctl -f -u veezbot -n 20 --no-pager 2>/dev/null" 2>&1 | prefix pi
  sleep 3
done) &

wait
