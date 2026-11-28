#!/usr/bin/env node
// Run FROM dev machine. Configures a WiFi network on the Pi interactively.
// Usage: node scripts/remote-wifi.mjs  (or: pnpm wifi:add)
import { createInterface } from 'node:readline';
import { ssh, PI_USER, PI_HOST } from './pi.mjs';

function question(prompt, { silent = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (silent) {
    // Mute echo while keeping the prompt itself visible — readline has no built-in silent mode.
    rl._writeToOutput = (chunk) => {
      if (chunk.startsWith(prompt) || chunk.trim() === '') rl.output.write(chunk);
    };
  }
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      if (silent) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

console.log(`==> WiFi configuration for Pi (${PI_HOST})\n`);
const ssid = await question('SSID:                       ');
const password = await question('Password:                   ', { silent: true });
const priorityRaw = await question('Priority (higher win):      ');
const priority = priorityRaw || '0';

const passwordB64 = Buffer.from(password, 'utf8').toString('base64');

// Runs on the Pi (bash + nmcli/wpa_passphrase are Pi-only, not relevant to dev-machine portability).
const remoteScript = `set -e
PASSWORD=$(printf '%s' "$PASS_B64" | base64 -d)
PSK=$(wpa_passphrase "$SSID" "$PASSWORD" | grep -v '#psk' | grep 'psk=' | cut -d= -f2)
sudo nmcli connection delete "$SSID" 2>/dev/null && echo "==> Removed existing '$SSID' connection." || true
sudo nmcli connection add type wifi con-name "$SSID" ssid "$SSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PSK" connection.autoconnect yes connection.autoconnect-priority "$PRIORITY"
echo "==> Network '$SSID' saved (priority $PRIORITY)."
echo "==> Attempting to connect..."
sudo nmcli connection up "$SSID" && echo "==> Connected." || echo "==> Not in range — will connect automatically when available."
`;

const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

console.log('\n==> Sending to Pi...');
await ssh(`SSID=${shQuote(ssid)} PASS_B64=${passwordB64} PRIORITY=${shQuote(priority)} bash -s`, { input: remoteScript });

console.log('\n==> Done.');
console.log(`==> To list saved networks: ssh -i <key> ${PI_USER}@${PI_HOST} nmcli connection show`);
