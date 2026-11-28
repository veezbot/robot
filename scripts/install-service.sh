#!/bin/bash
# Run directly ON the Pi. Installs veezbot as a systemd service that starts on boot.
# Usage: bash scripts/install-service.sh
set -e

ROBOT_DIR="${ROBOT_DIR:-}"
if [ -z "$ROBOT_DIR" ]; then
  echo "Error: ROBOT_DIR is not set. Run via remote-install-service.sh." >&2
  exit 1
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
NODE_BIN="$(which node)"

echo "==> Node binary: $NODE_BIN"
echo "==> Robot dir:   $ROBOT_DIR"

cat > /tmp/veezbot.service << EOF
[Unit]
Description=VeezBot Robot Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=$NODE_BIN --enable-source-maps $ROBOT_DIR/dist/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/veezbot.service /etc/systemd/system/veezbot.service
sudo systemctl daemon-reload
sudo systemctl enable veezbot
sudo systemctl restart veezbot

echo ""
echo "==> Service installed and enabled on boot."
echo "==> Status:  sudo systemctl status veezbot"
echo "==> Logs:    journalctl -u veezbot -f"
