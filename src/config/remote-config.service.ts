import { BusService } from '../bus/bus.service';
import { SocketService } from '../socket/socket.service';
import { BusEvent } from '../bus/bus.events';
import { RobotConfigEvent, type RobotConfigGetResponse } from "@veezbot/robot-lib";

export class RemoteConfigService {
  robotId!: string;
  mediamtxUrl!: string;

  get whipUrl(): string {
    return `${this.mediamtxUrl}/robot/${this.robotId}/whip`;
  }

  constructor(
    socketService: SocketService,
    bus: BusService,
  ) {
    const fetchConfig = () => {
      socketService.emit(RobotConfigEvent.Get, undefined, (res: RobotConfigGetResponse) => {
        if (res.error) throw new Error(res.error);
        this.robotId = res.data!.robotId;
        this.mediamtxUrl = res.data!.mediamtxUrl;
        console.log('[RemoteConfigService] Config init', { robotId: this.robotId, whipUrl: this.whipUrl });
        bus.emit(BusEvent.ConfigReady);
      });
    };

    bus.on(BusEvent.SocketConnected, fetchConfig);
  }
}
