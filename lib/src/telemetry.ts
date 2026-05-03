import { z } from 'zod';

export const RobotTelemetryEvent = {
  Push: 'telemetry:push', // robot → server (fire-and-forget, every 2s)
} as const;

export const RobotStatusSchema = z.enum(['connecting', 'sleeping', 'awake', 'error']);
export type RobotStatus = z.infer<typeof RobotStatusSchema>;

export const BatteryDataSchema = z.object({
  voltage:  z.number(), // V
  current:  z.number(), // mA (positive = discharging, negative = charging)
  charging: z.boolean(),
});
export type BatteryData = z.infer<typeof BatteryDataSchema>;

export const NetworkQualitySchema = z.object({
  dbm:     z.number(), // signal level in dBm
  percent: z.number(), // 0–100 %
});
export type NetworkQuality = z.infer<typeof NetworkQualitySchema>;

export const RobotTelemetryDataSchema = z.object({
  status:         RobotStatusSchema,
  errors:         z.array(z.string()),
  cpuLoad:        z.number(), // 0–100 %
  socTemp:        z.number(), // °C
  ramUsed:        z.number(), // 0–100 %
  uptime:         z.number(), // seconds
  networkQuality: NetworkQualitySchema.nullable(),
  battery:        BatteryDataSchema.nullable(),
});
export type RobotTelemetryData = z.infer<typeof RobotTelemetryDataSchema>;
