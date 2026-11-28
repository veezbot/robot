import { z } from 'zod';

export const RobotChatEvent = {
  Message:  'chat:message',  // server → robot
  Speaking: 'chat:speaking', // robot → server
} as const;

// Minimal payload — only what the robot needs to speak the message
export const ChatMessagePayloadSchema = z.object({
  id:       z.string(),
  text:     z.string(),
  username: z.string(),
});
export type ChatMessagePayload = z.infer<typeof ChatMessagePayloadSchema>;

export const RobotChatSpeakingPayloadSchema = z.object({ state: z.enum(['start', 'end']) });
export type RobotChatSpeakingPayload = z.infer<typeof RobotChatSpeakingPayloadSchema>;
