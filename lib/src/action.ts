import { z } from 'zod';

export const ActionEvent = {
  Execute: 'action:execute',
} as const;

export const Action = {
  Sleep:        'sleep',
  Wake:         'wake',
  RebootClient: 'reboot-client',
  RebootSystem: 'reboot-system',
} as const;

// Robot-side: no robotId — the robot knows its own identity
export const ActionExecutePayloadSchema = z.object({
  action: z.string(),
  args:   z.record(z.string(), z.string()).optional(),
});
export type ActionExecutePayload = z.infer<typeof ActionExecutePayloadSchema>;
