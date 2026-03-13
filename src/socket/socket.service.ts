import { io, Socket } from 'socket.io-client';
import { BusService } from '../bus/bus.service';
import { LocalConfigService } from '../config/local-config.service';
import { SocketEvent } from './socket.events';

export class SocketService {
  private socket!: Socket;
  robotId!: string;

  get whipUrl(): string {
    return `${this.localConfig.mediamtxUrl}/robot/${this.robotId}/whip`;
  }

  constructor(
    bus: BusService,
    private readonly localConfig: LocalConfigService,
  ) {
    const socket = io(`${localConfig.serverUrl}/robot`, {
      auth: { token: localConfig.token },
    });

    socket.on('connect', () => {
      console.log('[SocketService] Connected!');
      this.socket = socket;
    });

    socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected!');
      bus.emit(SocketEvent.Disconnected);
    });

    socket.on('connect_error', error => {
      console.log('[SocketService] Error!', error.message);
    });
  }

  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket.on(event, handler);
  }
}
