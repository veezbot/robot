import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { LogService } from '../log/log.service';

const CONFIG_PATH = process.env.VEEZBOT_CONFIG_PATH ?? join('/boot', 'veezbot.config.json');

interface ConfigFile {
  token?: string;
  serverUrl?: string;
}

function required(envKey: string, fileValue: string | undefined, label: string): string {
  const value = process.env[envKey] ?? fileValue;
  if (!value) throw new Error(`Missing config: ${label}`);
  return value;
}

/** Env + /boot/veezbot.config.json, read once at boot. Reads no child process: safe before the GPIO init. */
export class LocalConfigService {
  readonly token: string;
  readonly serverUrl: string;
  /** No hardware: mock GPIO, no stream publisher. */
  readonly mock: boolean;

  constructor(private readonly log: LogService) {
    const file = this.loadFile();
    this.token     = required('TOKEN', file.token, 'token (env: TOKEN, file: token)');
    this.serverUrl = required('SERVER_URL', file.serverUrl, 'serverUrl (env: SERVER_URL, file: serverUrl)');
    this.mock      = process.env['MOCK'] === 'true';
    this.log.info(`serverUrl=${this.serverUrl}${this.mock ? ' (mock)' : ''}`);
  }

  private loadFile(): ConfigFile {
    if (!existsSync(CONFIG_PATH)) return {};
    this.log.info(`Loaded from ${CONFIG_PATH}`);
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ConfigFile;
  }
}
