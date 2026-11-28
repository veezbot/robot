import { io, Socket } from 'socket.io-client';
import { ErrorCode, ROBOT_PROTOCOL, type OutdatedRobotData, type RobotHandshakeAuth, type WsResponse } from '@veezbot/robot-lib';
import { Notifier } from '../notifier';
import { LogService } from '../log/log.service';
import { LocalConfigService } from '../config/local-config.service';

/** Structural slice of a zod schema: the robot reads the lib's schemas without depending on zod itself. */
export interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export type Ack = (response: WsResponse<Record<string, unknown>>) => void;

export class SocketService {
  private readonly socket: Socket;

  readonly connected    = new Notifier();
  readonly disconnected = new Notifier();
  readonly heartbeat    = new Notifier();

  constructor(localConfig: LocalConfigService, private readonly log: LogService) {
    log.info(`Connecting to ${localConfig.serverUrl}/robot (protocol ${ROBOT_PROTOCOL})`);
    const auth: RobotHandshakeAuth = { token: localConfig.token, protocol: ROBOT_PROTOCOL };
    this.socket = io(`${localConfig.serverUrl}/robot`, {
      auth,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3_000,
      reconnectionDelayMax: 10_000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      log.info('Connected');
      this.connected.emit();
    });

    this.socket.on('ws:ping', (ack: () => void) => { ack(); this.heartbeat.emit(); });

    this.socket.on('disconnect', (reason) => {
      log.warn(`Disconnected: ${reason}`);
      this.disconnected.emit();
    });

    this.socket.on('connect_error', (error: Error) => {
      log.warn(`Connection error: ${error.message}`);
      if (error.message === ErrorCode.InvalidToken || error.message === ErrorCode.MissingToken) {
        log.error('Fatal auth error, exiting');
        process.exit(1);
      }
      // Retrying can't help: only an update of this robot can.
      if (error.message === ErrorCode.OutdatedRobot) {
        const { required } = ((error as Error & { data?: OutdatedRobotData }).data ?? {}) as Partial<OutdatedRobotData>;
        log.error(`This robot speaks protocol ${ROBOT_PROTOCOL}, the server requires ${required ?? 'a newer one'}: update the robot (latest release), then restart it. Exiting`);
        process.exit(1);
      }
    });
  }

  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  rpc<T>(event: string, data?: unknown, timeoutMs = 5_000): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(timeoutMs).emit(event, data, (err: Error | null, res: T) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  /**
   * A server event, its payload validated first. A handler that throws is logged, never left to crash the process;
   * the ack (a no-op when the server sent none) answers an invalid payload or a throw with an error.
   */
  handle<T>(event: string, schema: Schema<T>, handler: (payload: T, ack: Ack) => void | Promise<void>) {
    this.socket.on(event, async (raw: unknown, callback?: Ack) => {
      const ack: Ack = typeof callback === 'function' ? callback : () => {};
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        this.log.warn(`Invalid '${event}' payload: ${String(parsed.error)}`);
        ack({ error: `Invalid payload for ${event}` });
        return;
      }
      try {
        await handler(parsed.data, ack);
      } catch (e) {
        this.log.error(`'${event}' handler failed: ${String(e)}`);
        ack({ error: String(e) });
      }
    });
  }

  close() {
    this.socket.close();
  }
}
