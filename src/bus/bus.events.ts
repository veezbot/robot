export const BusEvent = {
  // ── Socket ────────────────────────────────────────────────────────────────
  SocketConnected:    'socket:connected',
  SocketDisconnected: 'socket:disconnected',
  // ── Config ────────────────────────────────────────────────────────────────
  ConfigReady:        'config:ready',
} as const;

export type BusEvent = typeof BusEvent[keyof typeof BusEvent];

export type BusPayload = {
  [BusEvent.SocketConnected]:    undefined;
  [BusEvent.SocketDisconnected]: undefined;
  [BusEvent.ConfigReady]:        undefined;
};
