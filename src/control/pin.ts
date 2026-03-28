import { PinCommand, PinOp } from '@veezbot/robot-lib';
import { openPin, GpioHandle } from './gpio-factory';

const write: Record<PinOp, (h: GpioHandle, v: number) => void> = {
  digital: (h, v) => h.digitalWrite(v),
  pwm:     (h, v) => h.pwmWrite(v),
  servo:   (h, v) => h.servoWrite(v),
};

export class Pin {
  private readonly handle: GpioHandle;
  private readonly op: PinOp;

  constructor(bcmPin: number, op: PinOp) {
    this.handle = openPin(bcmPin);
    this.op = op;
  }

  apply(cmd: PinCommand) {
    const value = cmd.op === 'servo' ? cmd.pulseWidth : cmd.value;
    write[cmd.op](this.handle, value);
  }

  stop() {
    write[this.op](this.handle, 0);
  }
}
