#!/bin/bash
# Run FROM dev machine. Watches robot/ for changes, deploys and restarts on Pi.
# Usage: bash scripts/dev.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROBOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

prefix() { sed -u "s/^/[$1] /"; }

# 1. Watch lib/ → build lib/dist/ locally → sync + restart on Pi
(cd "$ROBOT_DIR/lib" && pnpm exec tsup src/index.ts --format cjs,esm --dts --watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-dist.sh" 2>&1 | prefix lib) &

# 2. Watch robot/ → build dist/ locally → sync + restart on Pi
(cd "$ROBOT_DIR" && pnpm exec tsc-watch --onSuccess "bash $SCRIPT_DIR/remote-deploy-dist.sh" 2>&1 | prefix robot) &

wait
