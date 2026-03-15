import { BusService } from '../bus/bus.service';
import { LocalConfigService } from './local-config.service';
import { SocketService } from '../socket/socket.service';
import { BusEvent } from '../bus/bus.events';
import { RobotConfigEvent, RobotConfigPayload } from "@veezbot/lib";

export class RemoteConfigService {
  robotId!: string;

  get whipUrl(): string {
    return `${this.localConfig.mediamtxUrl}/robot/${this.robotId}/whip`;
  }

  constructor(
    socketService: SocketService,
    private readonly localConfig: LocalConfigService,
    bus: BusService,
  ) {
    const fetchConfig = () => {
      socketService.emit(RobotConfigEvent.Get, undefined, (res: RobotConfigPayload[typeof RobotConfigEvent.Get]) => {
        if (res.error) throw new Error(res.error);
        this.robotId = res.data!.robotId;
        console.log('[RemoteConfigService] Config init', { robotId: this.robotId, whipUrl: this.whipUrl });
        bus.emit(BusEvent.ConfigReady);
      });
    };

    bus.on(BusEvent.SocketConnected, fetchConfig);
  }
}
