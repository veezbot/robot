import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILENAME = 'veezbot.config.json';
const SERVER_URL = process.env.SERVER_URL ?? 'localhost';

interface LocalConfig {
  token: string;
}

export class LocalConfigService {
  readonly token: string;
  readonly serverUrl = `http://${SERVER_URL}:3000`;
  readonly mediamtxUrl = `http://${SERVER_URL}:8889`;

  constructor() {
    const config = this.loadConfig();
    this.token = config.token;
  }

  private loadConfig(): LocalConfig {
    const paths = [
      join('/boot', CONFIG_FILENAME),
      join(process.cwd(), CONFIG_FILENAME),
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        console.log(`[LocalConfigService] Loaded from ${path}`);
        return JSON.parse(readFileSync(path, 'utf-8')) as LocalConfig;
      }
    }

    throw new Error(`[LocalConfigService] No config file found. Expected at:\n${paths.join('\n')}`);
  }
}
