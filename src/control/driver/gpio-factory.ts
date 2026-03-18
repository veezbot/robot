let GpioClass: new (pin: number, mode: string) => GpioHandle;

try {
  GpioClass = require('pigpio').Gpio;
  console.log('[gpio] pigpio loaded (hardware mode)');
} catch (err) {
  console.warn('[gpio] pigpio unavailable, using mock:', (err as Error).message);
  GpioClass = class MockGpio implements GpioHandle {
    constructor(private pin: number, private mode: string) {}
    digitalWrite(level: number) {
    }
    pwmWrite(value: number) {
    }
    servoWrite(pulseWidth: number) {
    }
    hardwarePwmWrite(frequency: number, dutyCycle: number) {
    }
  } as unknown as new (pin: number, mode: string) => GpioHandle;
}

export interface GpioHandle {
  digitalWrite(level: number): void;
  pwmWrite(value: number): void;
  servoWrite(pulseWidth: number): void;
  hardwarePwmWrite(frequency: number, dutyCycle: number): void;
}

export function openPin(bcmPin: number): GpioHandle {
  return new GpioClass(bcmPin, 'OUTPUT');
}
