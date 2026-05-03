import * as os from 'os';
import { readFileSync } from 'fs';
import { RobotTelemetryEvent, type BatteryData, type RobotTelemetryData, type NetworkQuality } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';
import { StateService } from '../state/state.service';

const INTERVAL_MS = 2_000;
const CPU_SAMPLE_MS = 1_000;

// INA219 on I2C bus 1, address 0x43
// Shunt: 0.1Ω, calibration: 4096 → current_lsb = 0.1mA
const INA219_BUS   = 1;
const INA219_ADDR  = 0x43;
const INA219_CAL   = 0x0010; // 0x1000 big-endian → write as 0x0010 in SMBus word
const REG_CAL      = 0x05;
const REG_BUS_V    = 0x02;
const REG_CURRENT  = 0x04;

let i2cBus: { readWord(addr: number, cmd: number, cb: (err: Error | null, val: number) => void): void; writeWord(addr: number, cmd: number, val: number, cb: (err: Error | null) => void): void } | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const i2c = require('i2c-bus');
  const bus = i2c.openSync(INA219_BUS);
  // Write calibration register (big-endian: 0x0010 in SMBus word = 0x1000 on chip)
  bus.writeWordSync(INA219_ADDR, REG_CAL, INA219_CAL);
  i2cBus = bus;
} catch (err) {
  console.warn(`[TelemetryService] I2C/INA219 unavailable: ${(err as Error).message}`);
}

function swapBytes(val: number): number {
  return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}

async function getBattery(): Promise<BatteryData | null> {
  if (!i2cBus) return null;
  return new Promise((resolve) => {
    i2cBus!.readWord(INA219_ADDR, REG_BUS_V, (err, rawV) => {
      if (err) return resolve(null);
      i2cBus!.readWord(INA219_ADDR, REG_CURRENT, (err2, rawI) => {
        if (err2) return resolve(null);
        const busReg = swapBytes(rawV);
        const voltage = Math.round(((busReg >> 3) * 4) / 10) / 100; // V, 2 decimals
        let raw = swapBytes(rawI);
        if (raw > 0x7FFF) raw -= 0x10000;                            // signed 16-bit
        const current = Math.round(raw * 0.1);                       // mA
        resolve({ voltage, current, charging: current < 0 });
      });
    });
  });
}

function getCpuLoad(): Promise<number> {
  return new Promise((resolve) => {
    const sample = () => os.cpus().map((c) => ({ ...c.times }));
    const t1 = sample();
    setTimeout(() => {
      const t2 = sample();
      let idle = 0, total = 0;
      for (let i = 0; i < t1.length; i++) {
        const d = {
          user: t2[i].user - t1[i].user,
          nice: t2[i].nice - t1[i].nice,
          sys: t2[i].sys - t1[i].sys,
          idle: t2[i].idle - t1[i].idle,
          irq: t2[i].irq - t1[i].irq,
        };
        const sum = d.user + d.nice + d.sys + d.idle + d.irq;
        idle += d.idle;
        total += sum;
      }
      resolve(total === 0 ? 0 : Math.round((1 - idle / total) * 100));
    }, CPU_SAMPLE_MS);
  });
}

function getSocTemp(): number {
  try {
    return Math.round(parseInt(readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8')) / 100) / 10;
  } catch {
    return 0;
  }
}

function getRamUsed(): number {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round((1 - free / total) * 100);
}

function getNetworkQuality(): NetworkQuality | null {
  try {
    const content = readFileSync('/proc/net/wireless', 'utf8');
    // Lines: header, header, wlan0: status link level noise ...
    const line = content.split('\n').find((l) => l.includes(':') && !l.includes('Inter'));
    if (!line) return null;
    // level column is the 4th value after the interface name (strip trailing dot)
    const parts = line.split(':')[1].trim().split(/\s+/);
    const dbm = parseFloat(parts[2]); // signal level in dBm
    // Map dBm range [-90, -30] to [0, 100]%
    const percent = Math.round(Math.min(100, Math.max(0, (dbm + 90) / 60 * 100)));
    return { dbm: Math.round(dbm), percent };
  } catch {
    return null; // wired or unavailable
  }
}

export class TelemetryService {
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly socket: SocketService,
    private readonly state: StateService,
  ) {
    socket.connected.register(()    => this.start());
    socket.disconnected.register(() => this.stop());
  }

  private async push() {
    const [cpuLoad, battery] = await Promise.all([getCpuLoad(), getBattery()]);
    const socTemp = getSocTemp();
    const ramUsed = getRamUsed();
    const uptime  = Math.floor(os.uptime());
    const networkQuality = getNetworkQuality();
    const status = this.state.status;
    const errors = this.state.errors;

    const payload: RobotTelemetryData = { status, errors, cpuLoad, socTemp, ramUsed, uptime, networkQuality, battery };
    this.socket.emit(RobotTelemetryEvent.Push, payload);
  }

  start() {
    this.telemetryInterval = setInterval(() => this.push(), INTERVAL_MS);
    this.push();
  }

  stop() {
    if (this.telemetryInterval) { clearInterval(this.telemetryInterval); this.telemetryInterval = null; }
  }
}
