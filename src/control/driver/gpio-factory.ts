let GpioClass: new (pin: number, mode: string) => GpioHandle;

try {
  GpioClass = require('pigpio').Gpio;
} catch {
  GpioClass = class MockGpio implements GpioHandle {
    constructor(private pin: number, private mode: string) {}
    digitalWrite(level: number) {
      console.log(`[MockGpio] pin=${this.pin} digitalWrite(${level})`);
    }
    pwmWrite(value: number) {
      console.log(`[MockGpio] pin=${this.pin} pwmWrite(${value})`);
    }
    servoWrite(pulseWidth: number) {
      console.log(`[MockGpio] pin=${this.pin} servoWrite(${pulseWidth})`);
    }
    hardwarePwmWrite(frequency: number, dutyCycle: number) {
      console.log(`[MockGpio] pin=${this.pin} hardwarePwmWrite(freq=${frequency}, duty=${dutyCycle})`);
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
