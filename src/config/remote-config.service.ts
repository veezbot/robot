import { ConfigEvent, ConfigInitPayload } from '@veezbot/lib';
import { BusService } from '../bus/bus.service';
import { LocalConfigService } from './local-config.service';
import { SocketService } from '../socket/socket.service';
import { SocketEvent } from '../socket/socket.events';

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
    socketService.on(ConfigEvent.Init, ({ robotId }: ConfigInitPayload) => {
      console.log('[RemoteConfigService] Config init', { robotId, whipUrl: this.whipUrl });
      this.robotId = robotId;
      bus.emit(SocketEvent.ConfigReady);
    });
  }
}
