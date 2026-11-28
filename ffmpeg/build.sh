SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Building ffmpeg-whip for arm64..."
FFMPEG_OUT_DIR="$SCRIPT_DIR/bin"
rm -rf "$FFMPEG_OUT_DIR"
docker buildx build \
  --platform linux/arm64 \
  --output "type=local,dest=$FFMPEG_OUT_DIR" \
  -f "$SCRIPT_DIR/Dockerfile.ffmpeg" \
  "$SCRIPT_DIR"
