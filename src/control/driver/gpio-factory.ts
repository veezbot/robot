let GpioClass: new (pin: number, mode: string) => GpioHandle;

console.log('[gpio] loading gpio driver', process.env['MOCK_GPIO']);

if (process.env['MOCK_GPIO'] === 'true') {
  console.log('[gpio] MOCK_GPIO=true, using mock');
  GpioClass = class MockGpio implements GpioHandle {
    constructor(_pin: number, _mode: string) {}
    digitalWrite(_level: number) {}
    pwmWrite(_value: number) {}
    servoWrite(_pulseWidth: number) {}
    hardwarePwmWrite(_frequency: number, _dutyCycle: number) {}
  } as unknown as new (pin: number, mode: string) => GpioHandle;
} else {
  try {
    GpioClass = require('pigpio').Gpio;
    console.log('[gpio] pigpio loaded (hardware mode)');
  } catch (err) {
    console.warn('[gpio] pigpio unavailable');
  }
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
