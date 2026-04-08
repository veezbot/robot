#!/bin/bash
# Run FROM dev machine. Installs veezbot as a systemd service on the Pi.
# Usage: bash scripts/remote-install-service.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

echo "==> Uploading install-service.sh to Pi..."
sshpass -p "$PI_PASS" scp -o StrictHostKeyChecking=no \
  "$(dirname "$0")/install-service.sh" "$PI_USER@$PI_HOST:/tmp/veezbot-install-service.sh"

echo "==> Running install-service.sh on Pi..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
  "export NVM_DIR=\$HOME/.nvm; [ -s \$NVM_DIR/nvm.sh ] && source \$NVM_DIR/nvm.sh; ROBOT_DIR=$PI_DIR bash /tmp/veezbot-install-service.sh"

echo "==> Done."
