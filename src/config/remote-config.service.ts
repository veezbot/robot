import { RobotConfigEvent, RobotConfigInitSchema, type WsResponse } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';
import { LogService } from '../log/log.service';
import type { RuntimeConfig } from '../lifecycle';

/** Fetched on each wake, so a config edited while asleep applies on the next one. */
export class RemoteConfigService {
  constructor(private readonly socket: SocketService, private readonly log: LogService) {}

  async fetch(): Promise<RuntimeConfig> {
    const res = await this.socket.rpc<WsResponse<unknown>>(RobotConfigEvent.Get);
    if (res.error) throw new Error(`Config refused: ${res.error}`);
    const parsed = RobotConfigInitSchema.safeParse(res.data);
    if (!parsed.success) throw new Error(`Invalid config: ${parsed.error.message}`);
    const config = deepFreeze(parsed.data);
    this.log.info(`Loaded: robotId=${config.robotId} pins=${config.config.pins?.length ?? 0} audio=${config.config.audio?.alsaDevice ?? 'off'}`);
    return config;
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
