export const ErrorCode = {
  MissingToken:       'MISSING_TOKEN',
  InvalidToken:       'INVALID_TOKEN',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
