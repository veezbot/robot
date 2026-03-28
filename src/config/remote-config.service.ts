import { BusService } from '../bus/bus.service';
import { SocketService } from '../socket/socket.service';
import { BusEvent } from '../bus/bus.events';
import { RobotConfigEvent, type PinConfig, type RobotConfigGetResponse } from "@veezbot/robot-lib";

export class RemoteConfigService {
  robotId!: string;
  streamUrl!: string;
  pins: PinConfig[] = [];

  get whipUrl(): string {
    return `${this.streamUrl}/robot/${this.robotId}/whip`;
  }

  constructor(
    socketService: SocketService,
    bus: BusService,
  ) {
    const fetchConfig = () => {
      socketService.emit(RobotConfigEvent.Get, undefined, (res: RobotConfigGetResponse) => {
        if (res.error) throw new Error(res.error);
        this.robotId = res.data!.robotId;
        this.streamUrl = res.data!.streamUrl;
        this.pins = res.data!.config.pins ?? [];
        console.log('[RemoteConfigService] Config init', { robotId: this.robotId, whipUrl: this.whipUrl });
        bus.emit(BusEvent.ConfigReady);
      });
    };

    bus.on(BusEvent.SocketConnected, fetchConfig);
  }
}
