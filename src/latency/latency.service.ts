import { RobotLatencyEvent } from '@veezbot/robot-lib';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { SocketService } from '../socket/socket.service';

const PING_INTERVAL_MS = 200;

export class LatencyService {
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly socket: SocketService, private readonly bus: BusService) {}

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.socket.emit(RobotLatencyEvent.Ping, undefined, () => {
        this.bus.emit(BusEvent.Heartbeat);
      });
    }, PING_INTERVAL_MS);
  }

  stop() {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
  }
}
