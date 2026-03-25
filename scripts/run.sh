#!/bin/bash
# Run directly ON the Pi.
# Usage: SERVER_URL=http://... TOKEN=... bash scripts/run.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROBOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

NODE_BIN="$(which node)"

exec sudo -E SERVER_URL="$SERVER_URL" TOKEN="$TOKEN" \
  "$NODE_BIN" --enable-source-maps "$ROBOT_DIR/dist/main.js"
