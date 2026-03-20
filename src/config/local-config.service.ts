import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join('/boot', 'veezbot.config.json');

interface ConfigFile {
  token?: string;
  serverUrl?: string;
}

function fromEnvOrFile(key: string, file: ConfigFile): string {
  const value = process.env[key] ?? file[key as keyof ConfigFile];
  if (!value) throw new Error(`[LocalConfigService] Missing required config: ${key} (env or config file)`);
  return value;
}

function buildServerUrl(file: ConfigFile): string {
  if (process.env['SERVER_URL']) {
    const port = process.env['SERVER_PORT'];
    return port ? `http://${process.env['SERVER_URL']}:${port}` : `http://${process.env['SERVER_URL']}`;
  }
  if (file.serverUrl) return file.serverUrl;
  throw new Error(`[LocalConfigService] Missing required config: serverUrl (env SERVER_URL or config file)`);
}

export class LocalConfigService {
  readonly token: string;
  readonly serverUrl: string;

  constructor() {
    const file = this.loadFile();
    this.token = fromEnvOrFile('token', file);
    this.serverUrl = buildServerUrl(file);
    console.log(`[LocalConfigService] serverUrl=${this.serverUrl}`);
  }

  private loadFile(): ConfigFile {
    if (!existsSync(CONFIG_PATH)) return {};
    console.log(`[LocalConfigService] Loaded from ${CONFIG_PATH}`);
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ConfigFile;
  }
}
