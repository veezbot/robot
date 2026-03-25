#!/bin/bash
# Run FROM dev machine. SSH into the Pi and executes init.sh.
# Usage: bash scripts/remote-init.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

pi_run() {
  sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
    "export NVM_DIR=\$HOME/.nvm; [ -s \$NVM_DIR/nvm.sh ] && source \$NVM_DIR/nvm.sh; export PATH=\$HOME/.local/share/pnpm:\$PATH; bash -s" "$@"
}

echo "==> Uploading init.sh to Pi..."
sshpass -p "$PI_PASS" scp "$(dirname "$0")/init.sh" "$PI_USER@$PI_HOST:/tmp/veezbot-init.sh"

echo "==> Running init.sh on Pi..."
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "bash /tmp/veezbot-init.sh"

echo "==> Done."
