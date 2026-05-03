import { z } from 'zod';

export const RobotConfigEvent = {
  Get:    'config:get',    // robot → server (with ack)
  Update: 'config:update', // server → robot (push, no ack)
} as const;

export const PinOpSchema = z.enum(['digital', 'pwm', 'servo']);
export type PinOp = z.infer<typeof PinOpSchema>;

export const PinConfigSchema = z.object({
  pin:          z.number(),
  op:           PinOpSchema,
  defaultValue: z.number(),
});
export type PinConfig = z.infer<typeof PinConfigSchema>;

// Lean config — only what the robot needs at runtime
export const RobotConfigSchema = z.object({
  battery: z.object({ minV: z.number(), maxV: z.number() }).optional(),
  pins:    z.array(PinConfigSchema).optional(),
  audio:   z.object({ alsaDevice: z.string() }).optional(),
});
export type RobotConfig = z.infer<typeof RobotConfigSchema>;

// Payload the server sends back on config:get ack
export const RobotConfigInitSchema = z.object({
  robotId:       z.string(),
  videoWhipUrl:  z.string(),
  audioWhipUrl:  z.string(),
  config:        RobotConfigSchema,
});
export type RobotConfigInit = z.infer<typeof RobotConfigInitSchema>;
