import type { BatteryData } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';

// INA219 on I2C bus 1, address 0x43
// Shunt: 0.1Ω, calibration: 4096 → current_lsb = 0.1mA
const INA219_BUS  = 1;
const INA219_ADDR = 0x43;
const INA219_CAL  = 0x0010; // 0x1000 big-endian → write as 0x0010 in SMBus word
const REG_CAL     = 0x05;
const REG_BUS_V   = 0x02;
const REG_CURRENT = 0x04;

interface I2cBus {
  readWord(addr: number, cmd: number, cb: (err: Error | null, val: number) => void): void;
  writeWordSync(addr: number, cmd: number, val: number): void;
}

export type BatteryReader = () => Promise<BatteryData | null>;

/** `null` when there is no INA219 (no I2C, no hat): telemetry then reports no battery. */
export function openBattery(log: LogService): BatteryReader | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bus: I2cBus = require('i2c-bus').openSync(INA219_BUS);
    bus.writeWordSync(INA219_ADDR, REG_CAL, INA219_CAL);
    log.info('INA219 battery monitor ready');
    return () => read(bus);
  } catch (err) {
    log.warn(`I2C/INA219 unavailable: ${(err as Error).message.split('\n')[0]}`);
    return null;
  }
}

function read(bus: I2cBus): Promise<BatteryData | null> {
  return new Promise((resolve) => {
    bus.readWord(INA219_ADDR, REG_BUS_V, (err, rawV) => {
      if (err) return resolve(null);
      bus.readWord(INA219_ADDR, REG_CURRENT, (err2, rawI) => {
        if (err2) return resolve(null);
        const voltage = Math.round(((swapBytes(rawV) >> 3) * 4) / 10) / 100; // V, 2 decimals
        let raw = swapBytes(rawI);
        if (raw > 0x7FFF) raw -= 0x10000;                                     // signed 16-bit
        const current = Math.round(raw * 0.1);                                // mA
        resolve({ voltage, current, charging: current < 0 });
      });
    });
  });
}

function swapBytes(val: number): number {
  return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}
