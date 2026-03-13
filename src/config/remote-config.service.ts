import { ConfigEvent, ConfigInitPayload } from '@veezbot/lib';
import { LocalConfigService } from './local-config.service';
import { SocketService } from '../socket/socket.service';

export class RemoteConfigService {
  robotId!: string;

  get whipUrl(): string {
    return `${this.localConfig.mediamtxUrl}/robot/${this.robotId}/whip`;
  }

  constructor(
    socketService: SocketService,
    private readonly localConfig: LocalConfigService,
  ) {
    socketService.on(ConfigEvent.Init, ({ robotId }: ConfigInitPayload) => {
      this.robotId = robotId;
    });
  }
}
