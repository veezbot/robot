import { RobotTelemetryEvent, type RobotTelemetryData } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';
import { StateService } from '../state/state.service';
import { LogService } from '../log/log.service';
import type { BatteryReader } from './battery';
import { createCpuLoadSampler, readNetworkQuality, readRamUsed, readSocTemp, readUptime } from './system';

const INTERVAL_MS = 2_000;

export class TelemetryService {
  private interval: NodeJS.Timeout | null = null;
  private readonly cpuLoad = createCpuLoadSampler();

  constructor(
    private readonly socket: SocketService,
    private readonly state: StateService,
    private readonly battery: BatteryReader | null,
    private readonly log: LogService,
  ) {
    socket.connected.register(()    => this.start());
    socket.disconnected.register(() => this.stop());
  }

  private async push() {
    const battery = await (this.battery?.() ?? null);
    const payload: RobotTelemetryData = {
      status:         this.state.status,
      errors:         this.state.errors,
      cpuLoad:        this.cpuLoad(),
      socTemp:        readSocTemp(),
      ramUsed:        readRamUsed(),
      uptime:         readUptime(),
      networkQuality: readNetworkQuality(),
      battery,
    };
    this.socket.emit(RobotTelemetryEvent.Push, payload);
  }

  private tick() {
    this.push().catch((e) => this.log.error(`Push failed: ${String(e)}`));
  }

  private start() {
    this.stop();
    this.interval = setInterval(() => this.tick(), INTERVAL_MS);
    this.tick();
  }

  private stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }
}
