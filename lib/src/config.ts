import type { WsResponse } from './ws';

export const RobotConfigEvent = {
  Get: 'config:get', // robot → server (with ack)
} as const;

export type PinOp = 'digital' | 'pwm' | 'servo';

export interface PinConfig {
  pin:          number;
  op:           PinOp;
  defaultValue: number;
}

// Lean config — only what the robot needs at runtime
export interface RobotConfig {
  battery?: {
    minV: number; // 0%  voltage (e.g. 3.0 for LiPo 1S)
    maxV: number; // 100% voltage (e.g. 4.2 for LiPo 1S)
  };
  pins?: PinConfig[];
}

// Payload the server sends back on config:get ack
export interface RobotConfigInit {
  robotId:   string;
  streamUrl: string;
  config:    RobotConfig;
}

export type RobotConfigGetResponse = WsResponse<RobotConfigInit>;
