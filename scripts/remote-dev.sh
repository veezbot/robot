#!/bin/bash
# Run FROM dev machine. Watches robot/ for changes, deploys and restarts on Pi.
# Usage: bash scripts/dev.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROBOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

prefix() { sed -u "s/^/[$1] /"; }

CLEANING=0
cleanup() {
  [ "$CLEANING" = "1" ] && return
  CLEANING=1
  echo ""
  echo "==> Stopping..."
  kill $(jobs -p) 2>/dev/null || true
  sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
    "sudo pkill -f '[n]ode.*dist/main.js' 2>/dev/null || true" 2>/dev/null || true
  wait 2>/dev/null || true
  stty sane </dev/tty 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 1. Watch lib/ → build lib/dist/ locally → sync + restart on Pi
(cd "$ROBOT_DIR/lib" && pnpm exec tsup src/index.ts --format cjs,esm --dts --watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-dist.sh" 2>&1 | prefix lib) &

# 2. Watch robot/ → build dist/ locally → sync + restart on Pi
(cd "$ROBOT_DIR" && pnpm exec tsc-watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-dist.sh" 2>&1 | prefix robot) &

# 3. Loop: wait for .deploy-ready signal then start node on Pi
(while true; do
  if ! sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "[ -f $PI_DIR/.deploy-ready ]" 2>/dev/null; then
    echo "Waiting .deploy-ready..."
    sleep 0.5
    continue
  fi
  sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "rm -f $PI_DIR/.deploy-ready" 2>/dev/null || true
  echo "Starting..."
  bash "$SCRIPT_DIR/remote-start.sh" 2>&1 || true
  sleep 1
done) | prefix pi

wait
