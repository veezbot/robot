#!/usr/bin/env node
// One-time bootstrap: generates a dedicated SSH keypair and installs the public key on the Pi's
// authorized_keys, so every other remote-*.mjs script can use key auth — no sshpass, no PI_PASS
// stored anywhere, and it works natively on Windows (no WSL/git-bash required).
// Usage: node scripts/setup-ssh-key.mjs   — run it yourself; it prompts for the Pi's password once.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { KEY_PATH, PI_USER, PI_HOST } from './pi.mjs';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
    child.on('error', reject);
  });
}

if (!existsSync(KEY_PATH)) {
  mkdirSync(dirname(KEY_PATH), { recursive: true });
  console.log(`==> Generating a dedicated SSH key at ${KEY_PATH}...`);
  await run('ssh-keygen', ['-t', 'ed25519', '-N', '', '-C', 'veezbot-pi-deploy', '-f', KEY_PATH]);
} else {
  console.log(`==> Key already exists at ${KEY_PATH}, reusing it.`);
}

const pubKey = readFileSync(`${KEY_PATH}.pub`, 'utf8').trim();

console.log(`\n==> Installing the public key on ${PI_USER}@${PI_HOST} — enter the Pi's password when prompted.`);
await run('ssh', [
  '-o', 'StrictHostKeyChecking=no',
  `${PI_USER}@${PI_HOST}`,
  `mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qxF '${pubKey}' ~/.ssh/authorized_keys 2>/dev/null || echo '${pubKey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`,
]);

console.log('\n==> Verifying key auth...');
await run('ssh', ['-i', KEY_PATH, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', `${PI_USER}@${PI_HOST}`, 'echo OK']);

console.log('\n==> Done. Key auth is set up — PI_PASS is no longer needed by any script.');
