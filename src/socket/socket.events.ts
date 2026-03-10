import { Socket } from 'socket.io-client';

export enum SocketEvent {
  Connected = 'socket:connected',
  Disconnected = 'socket:disconnected',
}

export type SocketConnectedPayload = Socket