import type { PinCommand, PinConfig, PinOp } from '@veezbot/robot-lib';
import { openPin, GpioHandle } from './gpio-factory';

const write: Record<PinOp, (h: GpioHandle, v: number) => void> = {
  digital: (h, v) => h.digitalWrite(v),
  pwm:     (h, v) => h.pwmWrite(v),
  servo:   (h, v) => h.servoWrite(v),
};

/** A configured output pin. Its rest value is the configured `defaultValue`, not 0: an active-low pin rests at 1. */
export class Pin {
  private readonly handle: GpioHandle;

  constructor(private readonly config: PinConfig) {
    this.handle = openPin(config.pin);
  }

  get op(): PinOp {
    return this.config.op;
  }

  apply(cmd: PinCommand) {
    write[cmd.op](this.handle, cmd.op === 'servo' ? cmd.pulseWidth : cmd.value);
  }

  rest() {
    write[this.config.op](this.handle, this.config.defaultValue);
  }
}
