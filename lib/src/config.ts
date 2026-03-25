import type { WsResponse } from './ws';

export const RobotConfigEvent = {
  Get: 'config:get', // robot → server (with ack)
} as const;

// Lean config — only what the robot needs at runtime
export interface RobotConfig {
  battery?: {
    minV: number; // 0%  voltage (e.g. 3.0 for LiPo 1S)
    maxV: number; // 100% voltage (e.g. 4.2 for LiPo 1S)
  };
}

// Payload the server sends back on config:get ack
export interface RobotConfigInit {
  robotId:     string;
  mediamtxUrl: string;
  config:      RobotConfig;
}

export type RobotConfigGetResponse = WsResponse<RobotConfigInit>;
