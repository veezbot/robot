#!/bin/bash
# Run FROM dev machine. Copies the custom ffmpeg-whip binary to the Pi.
# Usage: bash scripts/remote-deploy-ffmpeg.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

ROBOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FFMPEG_BIN="$ROBOT_DIR/ffmpeg/bin/ffmpeg"

echo "==> Pushing ffmpeg-whip to Pi..."
sshpass -p "$PI_PASS" scp -o StrictHostKeyChecking=no "$FFMPEG_BIN" "$PI_USER@$PI_HOST:/tmp/ffmpeg-whip"
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
  "echo $PI_PASS | sudo -S mv /tmp/ffmpeg-whip /usr/local/bin/ffmpeg-whip && echo $PI_PASS | sudo -S chmod +x /usr/local/bin/ffmpeg-whip"

echo "==> Done."
