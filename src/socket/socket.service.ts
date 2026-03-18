import { io, Socket } from 'socket.io-client';
import { ErrorCode, ErrorMessage } from '@veezbot/lib';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { LocalConfigService } from '../config/local-config.service';

export class SocketService {
  private socket: Socket;

  constructor(
    bus: BusService,
    localConfig: LocalConfigService,
  ) {
    console.log(`[SocketService] Connecting to ${localConfig.serverUrl}/robot`);
    this.socket = io(`${localConfig.serverUrl}/robot`, {
      auth: { token: localConfig.token },
      reconnection: false,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected!');
      bus.emit(BusEvent.SocketConnected);
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected!');
      bus.emit(BusEvent.SocketDisconnected);
      this.socket.connect();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.log('[SocketService] Error!', error.message);
      const fatal = error.message === ErrorMessage[ErrorCode.InvalidToken] || error.message === ErrorMessage[ErrorCode.MissingToken];
      if (fatal) {
        console.error('[SocketService] Fatal auth error, not retrying');
      } else {
        setTimeout(() => this.socket.connect(), 3_000);
      }
    });
  }

  emit(event: string, data?: unknown, callback?: (data: any) => void) {
    if (callback !== undefined) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket.on(event, handler);
  }
}
