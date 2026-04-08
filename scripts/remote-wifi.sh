#!/bin/bash
# Run FROM dev machine. Configures a WiFi network on the Pi interactively.
# Usage: bash scripts/remote-wifi.sh
set -e

set -a; [ -f "$(dirname "$0")/.env" ] && source "$(dirname "$0")/.env"; set +a

echo "==> WiFi configuration for Pi ($PI_HOST)"
echo ""

read -rp  "SSID:                       " WIFI_SSID
read -rsp "Password:                   " WIFI_PASSWORD; echo
read -rp  "Priority (higher win):      " WIFI_PRIORITY
WIFI_PRIORITY="${WIFI_PRIORITY:-0}"

# Encode password as base64 to safely pass it through SSH
WIFI_PASSWORD_B64=$(printf '%s' "$WIFI_PASSWORD" | base64)

echo ""
echo "==> Sending to Pi..."

sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" \
  "SSID=$(printf '%q' "$WIFI_SSID") PASS_B64=$WIFI_PASSWORD_B64 PRIORITY=$WIFI_PRIORITY bash -s" << 'REMOTE'
set -e

PASSWORD=$(printf '%s' "$PASS_B64" | base64 -d)

# Hash password using wpa_passphrase (PSK = PBKDF2-SHA1, 256-bit hex)
PSK=$(wpa_passphrase "$SSID" "$PASSWORD" | grep -v '#psk' | grep 'psk=' | cut -d= -f2)

# Remove existing connection with the same name if any
sudo nmcli connection delete "$SSID" 2>/dev/null && echo "==> Removed existing '$SSID' connection." || true

# Add new connection
sudo nmcli connection add \
  type wifi \
  con-name "$SSID" \
  ssid "$SSID" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "$PSK" \
  connection.autoconnect yes \
  connection.autoconnect-priority "$PRIORITY"

echo "==> Network '$SSID' saved (priority $PRIORITY)."
echo "==> Attempting to connect..."
sudo nmcli connection up "$SSID" && echo "==> Connected." || echo "==> Not in range — will connect automatically when available."
REMOTE

echo ""
echo "==> Done."
echo "==> To list saved networks: ssh $PI_USER@$PI_HOST nmcli connection show"
