#!/bin/bash
# Run FROM dev machine. Rsyncs dist/ to the Pi and signals a restart.
# Skips gracefully if Pi is offline.
# Usage: bash scripts/remote-deploy-dist.sh

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

if ! sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 "$PI_USER@$PI_HOST" true 2>/dev/null; then
  echo "==> Pi offline, skipping deploy."
  exit 0
fi

ROBOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SSH="sshpass -p $PI_PASS ssh -o StrictHostKeyChecking=no $PI_USER@$PI_HOST"

echo "==> Stopping app on Pi..."
$SSH "sudo systemctl stop veezbot 2>/dev/null || sudo pkill -f '[n]ode.*dist/main.js' || true" || true

# First deploy: install deps if node_modules is missing
if ! sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "[ -d $PI_DIR/node_modules ]"; then
  echo "==> First deploy: syncing package files..."
  sshpass -p "$PI_PASS" rsync -e "ssh -o StrictHostKeyChecking=no" -az \
    "$ROBOT_DIR/package.json" \
    "$ROBOT_DIR/pnpm-lock.yaml" \
    "$ROBOT_DIR/pnpm-workspace.yaml" \
    "$PI_USER@$PI_HOST:$PI_DIR/"
  sshpass -p "$PI_PASS" rsync -e "ssh -o StrictHostKeyChecking=no" -az \
    "$ROBOT_DIR/lib/package.json" \
    "$PI_USER@$PI_HOST:$PI_DIR/lib/"
  echo "==> Installing dependencies on Pi..."
  sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
    "export NVM_DIR=\$HOME/.nvm; [ -s \$NVM_DIR/nvm.sh ] && source \$NVM_DIR/nvm.sh; export PATH=\$HOME/.local/share/pnpm:\$PATH; cd $PI_DIR && pnpm install --frozen-lockfile && npm rebuild pigpio i2c-bus --prefix ."
fi

$SSH "mkdir -p $PI_DIR/dist $PI_DIR/lib/dist"

echo "==> Syncing lib/dist/..."
sshpass -p "$PI_PASS" rsync -e "ssh -o StrictHostKeyChecking=no" -az --delete \
  "$ROBOT_DIR/lib/dist/" "$PI_USER@$PI_HOST:$PI_DIR/lib/dist/"

echo "==> Syncing dist/..."
sshpass -p "$PI_PASS" rsync -e "ssh -o StrictHostKeyChecking=no" -az --delete \
  "$ROBOT_DIR/dist/" "$PI_USER@$PI_HOST:$PI_DIR/dist/"

echo "==> Waiting for port 8888 to clear..."
$SSH "sudo fuser -k 8888/tcp 2>/dev/null || true; while sudo ss -tlnp | grep -q ':8888'; do sleep 0.2; done" || true

if [ -n "$TOKEN" ] && [ -n "$SERVER_URL" ]; then
  echo "==> Writing /boot/veezbot.config.json..."
  $SSH "printf '{\"token\":\"%s\",\"serverUrl\":\"%s\"}\n' \"$TOKEN\" \"$SERVER_URL\" | sudo tee /boot/veezbot.config.json > /dev/null"
fi

echo "==> Starting app on Pi..."
$SSH "sudo systemctl start veezbot 2>/dev/null || true" || true

echo "==> Done."
