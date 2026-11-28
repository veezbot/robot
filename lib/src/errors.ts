export const ErrorCode = {
  MissingToken:       'MISSING_TOKEN',
  InvalidToken:       'INVALID_TOKEN',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  OutdatedRobot:      'OUTDATED_ROBOT', // its protocol is below the server's: `data` is an OutdatedRobotData
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
