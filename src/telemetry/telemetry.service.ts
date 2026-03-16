import * as os from 'os';
import { readFileSync } from 'fs';
import { RobotLatencyEvent, RobotTelemetryEvent, type RobotTelemetryData } from '@veezbot/lib';
import { SocketService } from '../socket/socket.service';
import { StateService } from '../state/state.service';

const INTERVAL_MS = 2_000;
const CPU_SAMPLE_MS = 1_000;

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
    const cpuLoad = await getCpuLoad();
    const socTemp = getSocTemp();
    const ramUsed = getRamUsed();
    const uptime  = Math.floor(os.uptime());
    const networkQuality = getNetworkQuality();
    const state = this.state.currentState;

    const payload: RobotTelemetryData = { state, pingMs: this.lastPingMs, cpuLoad, socTemp, ramUsed, uptime, networkQuality };
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
