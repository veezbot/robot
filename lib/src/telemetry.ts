export type RobotStatus = 'connecting' | 'sleeping' | 'awake' | 'error';

export interface BatteryData {
  voltage:  number;  // V
  current:  number;  // mA (positive = discharging, negative = charging)
  charging: boolean;
}

export interface NetworkQuality {
  dbm:     number;  // signal level in dBm
  percent: number;  // 0–100 %
}

export interface RobotTelemetryData {
  status:         RobotStatus;
  error:          string | null;
  pingMs:         number;  // RTT to server in ms
  cpuLoad:        number;  // 0–100 %
  socTemp:        number;  // °C
  ramUsed:        number;  // 0–100 %
  uptime:         number;  // seconds
  networkQuality: NetworkQuality | null;
  battery:        BatteryData | null;
}

export const RobotTelemetryEvent = {
  Push: 'telemetry:push', // robot → server (fire-and-forget, every 2s)
} as const;
