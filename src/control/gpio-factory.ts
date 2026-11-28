import { LogService } from '../log/log.service';

export interface GpioHandle {
  digitalWrite(level: number): void;
  pwmWrite(value: number): void;
  servoWrite(pulseWidth: number): void;
}

type GpioClass = new (pin: number, options: { mode: number }) => GpioHandle;

class MockGpio implements GpioHandle {
  digitalWrite(_level: number) {}
  pwmWrite(_value: number) {}
  servoWrite(_pulseWidth: number) {}
}

let Gpio: GpioClass | null = null;
let outputMode = 0;
let terminate: (() => void) | null = null;

/**
 * Must run before any child process exists: pigpio takes over the signals, SIGCHLD included, and Node only gets child
 * exits back if its own handler is installed after. Left to the first `new Gpio`, a running ffmpeg is never seen ending.
 */
export function initGpio(mock: boolean, log: LogService): void {
  if (mock) {
    Gpio = MockGpio as unknown as GpioClass;
    log.info('Mock GPIO');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pigpio = require('pigpio');
    pigpio.initialize();
    Gpio       = pigpio.Gpio;
    outputMode = pigpio.Gpio.OUTPUT;
    terminate  = () => pigpio.terminate();
    log.info('pigpio initialized (hardware mode)');
  } catch (err) {
    log.error(`pigpio unavailable, pins disabled: ${(err as Error).message}`);
  }
}

export function terminateGpio(): void {
  terminate?.();
  terminate = null;
}

export function openPin(bcmPin: number): GpioHandle {
  if (!Gpio) throw new Error('GPIO unavailable (pigpio failed to load)');
  return new Gpio(bcmPin, { mode: outputMode });
}
