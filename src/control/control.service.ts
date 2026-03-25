import { RobotControlEvent, RobotPinOutputPayload, PinCommand } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { openPin, GpioHandle } from './driver/gpio-factory';

const FAILSAFE_MS = 500;

export class ControlService {
  private readonly pins = new Map<number, GpioHandle>();
  private active        = false;
  private failsafe:       NodeJS.Timeout | null = null;

  constructor(socketService: SocketService, private readonly log: LogService) {
    socketService.on(RobotControlEvent.Pins, (payload: RobotPinOutputPayload) => {
      this.applyPins(payload.pins);
    });
  }

  private pin(n: number): GpioHandle {
    if (!this.pins.has(n)) this.pins.set(n, openPin(n));
    return this.pins.get(n)!;
  }

  private applyPins(commands: PinCommand[]) {
    if (!this.active) return;
    this.resetFailsafe();
    for (const cmd of commands) {
      const pin = this.pin(cmd.pin);
      if (cmd.op === 'digital') pin.digitalWrite(cmd.value);
      else if (cmd.op === 'pwm') pin.pwmWrite(cmd.value);
      else if (cmd.op === 'servo') pin.servoWrite(cmd.pulseWidth);
    }
  }

  private resetFailsafe() {
    if (this.failsafe) clearTimeout(this.failsafe);
    this.failsafe = setTimeout(() => {
      this.log.warn('Control failsafe triggered — stopping all pins');
      this.stopPins();
    }, FAILSAFE_MS);
  }

  private stopPins() {
    for (const pin of this.pins.values()) pin.digitalWrite(0);
  }

  start() {
    this.log.info('GPIO started');
    this.active = true;
  }

  stop() {
    this.log.info('GPIO stopped');
    this.active = false;
    if (this.failsafe) clearTimeout(this.failsafe);
    this.stopPins();
  }
}
