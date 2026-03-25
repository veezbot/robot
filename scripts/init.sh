#!/bin/bash
# Run directly ON the Pi.
# Usage: bash scripts/init.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROBOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> [1/3] System packages..."
sudo apt-get install -y build-essential ffmpeg

echo "==> [2/3] Node.js via nvm..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm install --lts
node --version

echo "==> [3/3] pnpm..."
if command -v pnpm &>/dev/null; then
  echo "already installed: $(pnpm --version)"
else
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PATH="$HOME/.local/share/pnpm:$PATH"
fi
pnpm --version

echo ""
echo "==> Done! Next: pnpm install && pnpm build, then scripts/run.sh"
