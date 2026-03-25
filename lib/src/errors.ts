export const ErrorCode = {
  MissingToken: 'MISSING_TOKEN',
  InvalidToken: 'INVALID_TOKEN',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
