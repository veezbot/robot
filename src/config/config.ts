import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILENAME = 'veezbot.config.json';

const serverUrl = process.env.SERVER_URL ?? 'localhost';
export const SERVER_URL = `http://${serverUrl}:3000`;
export const WHIP_URL = `http://${serverUrl}:8889/robot/whip`;

interface RobotConfig {
  token: string;
}

function loadConfig(): RobotConfig {
  const paths = [
    join('/boot', CONFIG_FILENAME),
    join(process.cwd(), CONFIG_FILENAME),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      console.log(`[Config] Loaded from ${path}`);
      return JSON.parse(readFileSync(path, 'utf-8')) as RobotConfig;
    }
  }

  throw new Error(`[Config] No config file found. Expected at:\n${paths.join('\n')}`);
}

export const config = loadConfig();
