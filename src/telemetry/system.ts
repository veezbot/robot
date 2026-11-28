import * as os from 'os';
import { readFileSync } from 'fs';
import type { NetworkQuality } from '@veezbot/robot-lib';

type CpuTimes = os.CpuInfo['times'];

const sampleCpus = (): CpuTimes[] => os.cpus().map((c) => ({ ...c.times }));

/**
 * CPU load (0–100 %) since the previous call: measured over the whole telemetry interval, with no wait of its own.
 * The first call measures since the sampler was created.
 */
export function createCpuLoadSampler(): () => number {
  let previous = sampleCpus();
  return () => {
    const current = sampleCpus();
    let idle = 0, total = 0;
    current.forEach((t, i) => {
      const p = previous[i];
      if (!p) return;
      const busy = (t.user - p.user) + (t.nice - p.nice) + (t.sys - p.sys) + (t.irq - p.irq);
      idle  += t.idle - p.idle;
      total += busy + (t.idle - p.idle);
    });
    previous = current;
    return total === 0 ? 0 : Math.round((1 - idle / total) * 100);
  };
}

/** SoC temperature in °C, 0 where the thermal zone is missing (not a Pi). */
export function readSocTemp(): number {
  try {
    return Math.round(parseInt(readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8')) / 100) / 10;
  } catch {
    return 0;
  }
}

/** RAM in use, 0–100 %. */
export function readRamUsed(): number {
  return Math.round((1 - os.freemem() / os.totalmem()) * 100);
}

export function readUptime(): number {
  return Math.floor(os.uptime());
}

/** Wifi signal from /proc/net/wireless, `null` when wired or unavailable. */
export function readNetworkQuality(): NetworkQuality | null {
  try {
    const content = readFileSync('/proc/net/wireless', 'utf8');
    // Two header lines, then `wlan0: status link level noise ...`
    const line = content.split('\n').find((l) => l.includes(':') && !l.includes('Inter'));
    if (!line) return null;
    const dbm = parseFloat(line.split(':')[1].trim().split(/\s+/)[2]); // the level column, in dBm
    // [-90, -30] dBm → [0, 100] %
    const percent = Math.round(Math.min(100, Math.max(0, (dbm + 90) / 60 * 100)));
    return { dbm: Math.round(dbm), percent };
  } catch {
    return null;
  }
}
