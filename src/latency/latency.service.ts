import { RobotLatencyEvent } from '@veezbot/robot-lib';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { SocketService } from '../socket/socket.service';

const PING_INTERVAL_MS = 200;

export class LatencyService {
  constructor(socketService: SocketService, bus: BusService) {
    bus.on(BusEvent.SocketConnected, () => {
      setInterval(() => {
        socketService.emit(RobotLatencyEvent.Ping, undefined, () => {
          bus.emit(BusEvent.Heartbeat, undefined);
        });
      }, PING_INTERVAL_MS);
    });
  }
}
