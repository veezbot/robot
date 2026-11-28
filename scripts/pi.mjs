// Shared helper for the robot/scripts/remote-*.mjs deploy scripts. Uses a dedicated SSH key (see
// setup-ssh-key.mjs) instead of sshpass, and scp instead of rsync — both sshpass and rsync aren't
// available on native Windows, so this works without WSL/git-bash.
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';

export const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
export const ROBOT_DIR = dirname(SCRIPTS_DIR);
export const KEY_PATH = join(SCRIPTS_DIR, '.ssh', 'id_veezbot');

config({ path: join(SCRIPTS_DIR, '.env') });

export const PI_USER = process.env.PI_USER;
export const PI_HOST = process.env.PI_HOST;
export const PI_DIR = process.env.PI_DIR;

function run(cmd, args, { input, silent } = {}) {
  return new Promise((resolve, reject) => {
    const stdio = silent ? 'ignore' : input !== undefined ? ['pipe', 'inherit', 'inherit'] : 'inherit';
    const child = spawn(cmd, args, { stdio });
    if (input !== undefined && !silent) child.stdin.end(input);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
    child.on('error', reject);
  });
}

const sshFlags = ['-i', KEY_PATH, '-o', 'StrictHostKeyChecking=no'];

// remoteCmd is forwarded as-is to the Pi's own shell — no local shell involved, so no local
// quoting concerns (only the remote/Pi-side bash quoting rules apply, same as the old scripts).
export function ssh(remoteCmd, { connectTimeout, input, silent } = {}) {
  const timeoutFlags = connectTimeout ? ['-o', `ConnectTimeout=${connectTimeout}`] : [];
  return run('ssh', [...sshFlags, ...timeoutFlags, `${PI_USER}@${PI_HOST}`, remoteCmd], { input, silent });
}

export function scp(args) {
  return run('scp', [...sshFlags, ...args]);
}

export function remote(path) {
  return `${PI_USER}@${PI_HOST}:${path}`;
}

export async function isPiOnline() {
  if (!existsSync(KEY_PATH)) return false;
  try {
    await ssh('true', { connectTimeout: 3, silent: true });
    return true;
  } catch {
    return false;
  }
}

// scp has no --delete: wipe the remote dir first, so stale files never linger. The target must not exist, so
// scp creates it with the content (`join(dir, '.')` drops the dot and nested dist/dist).
export async function syncDir(localDir, remoteDir) {
  await ssh(`rm -rf ${remoteDir} && mkdir -p ${posix.dirname(remoteDir)}`);
  await scp(['-r', localDir, remote(remoteDir)]);
}
