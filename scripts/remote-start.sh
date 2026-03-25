#!/bin/bash
# Run FROM dev machine. Starts the robot app on the Pi.
# Usage: bash scripts/remote-start.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

sshpass -p "$PI_PASS" ssh "$PI_USER@$PI_HOST" \
  "export NVM_DIR=\$HOME/.nvm; [ -s \$NVM_DIR/nvm.sh ] && source \$NVM_DIR/nvm.sh; \
   NODE_BIN=\$(which node); \
   sudo -E SERVER_URL=$SERVER_URL TOKEN=$TOKEN \$NODE_BIN --enable-source-maps $PI_DIR/dist/main.js" 2>&1
