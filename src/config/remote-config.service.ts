import { RobotConfigEvent, type PinConfig, type RobotConfigGetResponse } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';

export class RemoteConfigService {
  robotId!: string;
  streamUrl!: string;
  pins: PinConfig[] = [];

  get whipUrl(): string {
    return `${this.streamUrl}/robot/${this.robotId}/whip`;
  }

  constructor(private readonly socket: SocketService) {}

  async fetch(): Promise<void> {
    const res = await this.socket.rpc<RobotConfigGetResponse>(RobotConfigEvent.Get);
    if (res.error) throw new Error(res.error);
    this.robotId   = res.data!.robotId;
    this.streamUrl = res.data!.streamUrl;
    this.pins      = res.data!.config.pins ?? [];
    console.log('[RemoteConfigService] Config loaded', { robotId: this.robotId, whipUrl: this.whipUrl });
  }
}
