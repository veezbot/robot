import * as os from 'os';
import { readFileSync } from 'fs';
import { RobotLatencyEvent, RobotTelemetryEvent, type BatteryData, type RobotTelemetryData } from '@veezbot/lib';
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
} catch {
  // i2c-bus not available (dev machine) or hardware not present
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
        const current = Math.round(swapBytes(rawI) * 0.1);           // mA
        resolve({ voltage, current });
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

function getNetworkQuality(): RobotTelemetryData['networkQuality'] {
  try {
    const content = readFileSync('/proc/net/wireless', 'utf8');
    // Lines: header, header, wlan0: status link level noise ...
    const line = content.split('\n').find((l) => l.includes(':') && !l.includes('Inter'));
    if (!line) return 'poor';
    // level column is the 4th value after the interface name (strip trailing dot)
    const parts = line.split(':')[1].trim().split(/\s+/);
    const dbm = parseFloat(parts[2]); // signal level in dBm
    if (dbm >= -50) return 'excellent';
    if (dbm >= -60) return 'good';
    if (dbm >= -70) return 'fair';
    return 'poor';
  } catch {
    return 'good'; // fallback for wired / unavailable
  }
}

const PING_INTERVAL_MS = 3_000;

export class TelemetryService {
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingMs = 0;

  constructor(
    private readonly socket: SocketService,
    private readonly state: StateService,
  ) {
    this.start();
  }

  private measurePing() {
    const t = Date.now();
    this.socket.emit(RobotLatencyEvent.Ping, undefined, () => {
      this.lastPingMs = Date.now() - t;
    });
  }

  private async push() {
    const [cpuLoad, battery] = await Promise.all([getCpuLoad(), getBattery()]);
    const socTemp = getSocTemp();
    const ramUsed = getRamUsed();
    const uptime  = Math.floor(os.uptime());
    const networkQuality = getNetworkQuality();
    const state = this.state.currentState;

    const payload: RobotTelemetryData = { state, pingMs: this.lastPingMs, cpuLoad, socTemp, ramUsed, uptime, networkQuality, battery };
    this.socket.emit(RobotTelemetryEvent.Push, payload);
  }

  start() {
    this.measurePing();
    this.pingInterval = setInterval(() => this.measurePing(), PING_INTERVAL_MS);
    this.telemetryInterval = setInterval(() => this.push(), INTERVAL_MS);
    this.push();
  }

  stop() {
    if (this.telemetryInterval) { clearInterval(this.telemetryInterval); this.telemetryInterval = null; }
    if (this.pingInterval)      { clearInterval(this.pingInterval);      this.pingInterval = null; }
  }
}
