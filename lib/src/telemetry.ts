export type RobotState = 'wake' | 'sleep' | 'error';

export interface BatteryData {
  voltage:  number;  // V
  current:  number;  // mA (positive = discharging, negative = charging)
  charging: boolean;
}

export interface RobotTelemetryData {
  state:          RobotState;
  pingMs:         number;  // RTT to server in ms
  cpuLoad:        number;  // 0–100 %
  socTemp:        number;  // °C
  ramUsed:        number;  // 0–100 %
  uptime:         number;  // seconds
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  battery:        BatteryData | null;
}

export const RobotTelemetryEvent = {
  Push: 'telemetry:push', // robot → server (fire-and-forget, every 2s)
} as const;
