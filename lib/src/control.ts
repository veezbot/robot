import { z } from 'zod';

export const RobotControlEvent = {
  Pins: 'control:pins', // server → robot
} as const;

const PinCommandSchema = z.union([
  z.object({ pin: z.number(), op: z.literal('digital'), value: z.union([z.literal(0), z.literal(1)]) }),
  z.object({ pin: z.number(), op: z.literal('pwm'),     value: z.number() }),
  z.object({ pin: z.number(), op: z.literal('servo'),   pulseWidth: z.number() }),
]);

export const RobotPinOutputPayloadSchema = z.object({ pins: z.array(PinCommandSchema) });

export type PinCommand            = z.infer<typeof PinCommandSchema>;
export type RobotPinOutputPayload = z.infer<typeof RobotPinOutputPayloadSchema>;
