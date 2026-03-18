import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join('/boot', 'veezbot.config.json');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[LocalConfigService] Missing required env: ${name}`);
  return value;
}

interface LocalConfig {
  token: string;
}

export class LocalConfigService {
  readonly token: string;
  readonly serverUrl = `http://${required('SERVER_URL')}:${required('SERVER_PORT')}`;

  constructor() {
    const config = this.loadConfig();
    this.token = config.token;
    console.log(`[LocalConfigService] serverUrl=${this.serverUrl}`);
  }

  private loadConfig(): LocalConfig {
    if (!existsSync(CONFIG_PATH)) {
      throw new Error(`[LocalConfigService] No config file found at ${CONFIG_PATH}`);
    }
    console.log(`[LocalConfigService] Loaded from ${CONFIG_PATH}`);
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as LocalConfig;
  }
}
