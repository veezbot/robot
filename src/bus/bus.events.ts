export const BusEvent = {
  // ── Socket ────────────────────────────────────────────────────────────────
  SocketConnected:    'socket:connected',
  SocketDisconnected: 'socket:disconnected',
  // ── Latency ───────────────────────────────────────────────────────────────
  Heartbeat:          'latency:heartbeat',
} as const;

export type BusEvent = typeof BusEvent[keyof typeof BusEvent];

export type BusPayload = {
  [BusEvent.SocketConnected]:    undefined;
  [BusEvent.SocketDisconnected]: undefined;
  [BusEvent.Heartbeat]:          undefined;
};
