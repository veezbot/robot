import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join('/boot', 'veezbot.config.json');

interface ConfigFile {
  token?: string;
  serverUrl?: string;
}

function require_config(envKey: string, fileValue: string | undefined, label: string): string {
  const value = process.env[envKey] ?? fileValue;
  if (!value) throw new Error(`[LocalConfigService] Missing config: ${label}`);
  return value;
}

export class LocalConfigService {
  readonly token: string;
  readonly serverUrl: string;

  constructor() {
    const file = this.loadFile();
    this.token = require_config('TOKEN', file.token, 'token (env: TOKEN, file: token)');
    this.serverUrl = require_config('SERVER_URL', file.serverUrl, 'serverUrl (env: SERVER_URL, file: serverUrl)');
    console.log(`[LocalConfigService] serverUrl=${this.serverUrl}`);
  }

  private loadFile(): ConfigFile {
    if (!existsSync(CONFIG_PATH)) return {};
    console.log(`[LocalConfigService] Loaded from ${CONFIG_PATH}`);
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ConfigFile;
  }
}
