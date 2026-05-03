#!/bin/bash
# Run FROM dev machine. Rsyncs lib/dist/ to the Pi only — no restart.
# Skips gracefully if Pi is offline.

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

if ! sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 "$PI_USER@$PI_HOST" true 2>/dev/null; then
  echo "==> Pi offline, skipping lib sync."
  exit 0
fi

ROBOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Syncing lib/dist/..."
sshpass -p "$PI_PASS" rsync -e "ssh -o StrictHostKeyChecking=no" -az --delete \
  "$ROBOT_DIR/lib/dist/" "$PI_USER@$PI_HOST:$PI_DIR/lib/dist/"

echo "==> Done."
