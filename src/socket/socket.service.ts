import { EventEmitter } from 'events';
import { Socket } from 'socket.io-client';
import {SocketConnectedPayload, SocketEvent} from "./socket.events";

export class SocketService {
  private socket!: Socket;

  constructor(bus: EventEmitter) {
    bus.on(SocketEvent.Connected, (socket: SocketConnectedPayload) => this.socket = socket);
  }

  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket.on(event, handler);
  }
}