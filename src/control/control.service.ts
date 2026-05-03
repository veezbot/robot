import { RobotControlEvent, RobotPinOutputPayload } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { RemoteConfigService } from '../config/remote-config.service';
import { Pin } from './pin';

const FAILSAFE_MS = 1500;

export class ControlService {
  private readonly pins = new Map<number, Pin>();
  private active        = false;
  private failsafe:       NodeJS.Timeout | null = null;

  constructor(
    socketService: SocketService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly log: LogService,
  ) {
    socketService.heartbeat.register(() => { if (this.active) this.resetFailsafe(); });
    socketService.on(RobotControlEvent.Pins, (payload: RobotPinOutputPayload) => {
      this.applyPins(payload.pins);
    });
  }

  initPins() {
    this.pins.clear();
    for (const { pin, op, defaultValue } of this.remoteConfig.pins) {
      const p = new Pin(pin, op);
      p.reset(defaultValue);
      this.pins.set(pin, p);
    }
    this.log.info(`Control pins initialized: ${this.remoteConfig.pins.map((p) => `${p.pin}(${p.op})`).join(', ')}`);
  }

  private pin(n: number, op: RobotPinOutputPayload['pins'][number]['op']): Pin {
    if (!this.pins.has(n)) this.pins.set(n, new Pin(n, op));
    return this.pins.get(n)!;
  }

  private applyPins(commands: RobotPinOutputPayload['pins']) {
    if (!this.active) return;
    for (const cmd of commands) this.pin(cmd.pin, cmd.op).apply(cmd);
  }

  private resetFailsafe() {
    if (this.failsafe) clearTimeout(this.failsafe);
    this.failsafe = setTimeout(() => {
      this.failsafe = null;
      this.log.warn('Control failsafe triggered — stopping all pins');
      this.stopPins();
    }, FAILSAFE_MS);
  }

  private stopPins() {
    for (const pin of this.pins.values()) pin.stop();
  }

  start() {
    this.log.info('GPIO started');
    this.active = true;
  }

  stop() {
    this.log.info('GPIO stopped');
    this.active = false;
    if (this.failsafe) {
      clearTimeout(this.failsafe);
      this.failsafe = null;
    }
    this.stopPins();
  }
}
