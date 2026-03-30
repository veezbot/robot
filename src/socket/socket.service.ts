import { io, Socket } from 'socket.io-client';

import { ErrorCode } from '@veezbot/robot-lib';
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
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3_000,
      reconnectionDelayMax: 10_000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected!');
      bus.emit(BusEvent.SocketConnected);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected!', reason);
      bus.emit(BusEvent.SocketDisconnected);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.log('[SocketService] Error!', error.message);
      const fatal = error.message === ErrorCode.InvalidToken || error.message === ErrorCode.MissingToken;
      if (fatal) {
        console.error('[SocketService] Fatal auth error, exiting');
        process.exit(1);
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

  rpc<T>(event: string, data?: unknown, timeoutMs = 5_000): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(timeoutMs).emit(event, data, (err: Error | null, res: T) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket.on(event, handler);
  }
}
