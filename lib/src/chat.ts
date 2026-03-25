export const RobotChatEvent = {
  Message:  'chat:message',  // server → robot
  Speaking: 'chat:speaking', // robot → server
} as const;

// Minimal payload — only what the robot needs to speak the message
export interface ChatMessagePayload {
  id:       string;
  text:     string;
  username: string;
}

export interface RobotChatSpeakingPayload {
  state: 'start' | 'end';
}
