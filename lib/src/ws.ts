export type WsResponse<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };
