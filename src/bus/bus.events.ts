export const BusEvent = {
  // ── Socket ────────────────────────────────────────────────────────────────
  SocketConnected:    'socket:connected',
  SocketDisconnected: 'socket:disconnected',
  // ── Latency ───────────────────────────────────────────────────────────────
  Heartbeat:          'latency:heartbeat',
  // ── Errors ────────────────────────────────────────────────────────────────
  Error:              'error',
} as const;

export type BusEvent = typeof BusEvent[keyof typeof BusEvent];

export type BusPayload = {
  [BusEvent.SocketConnected]:    undefined;
  [BusEvent.SocketDisconnected]: undefined;
  [BusEvent.Heartbeat]:          undefined;
  [BusEvent.Error]:              { kind: string; message: string | null };
};
