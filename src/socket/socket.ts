import { EventEmitter } from 'events';
import { io } from 'socket.io-client';
import { SocketConnectedPayload, SocketEvent } from './socket.events';
import { config, SERVER_URL } from '../config/config';

export class SocketModule {
  constructor(bus: EventEmitter) {
    const socket = io(`${SERVER_URL}/robot`, {
      auth: { token: config.token },
    });

    socket.on('connect', () => {
      console.log('[SocketModule] Connected!');
      bus.emit(SocketEvent.Connected, socket as SocketConnectedPayload)
    });

    socket.on('disconnect', () => {
      console.log('[SocketModule] Disconnected!');
      bus.emit(SocketEvent.Disconnected)
    });

    socket.on('connect_error', error => {
      console.log('[SocketModule] Error!', error.message);
    })
  }
}
