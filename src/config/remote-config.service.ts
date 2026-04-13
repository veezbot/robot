import { RobotConfigEvent, type PinConfig, type RobotConfig, type RobotConfigGetResponse } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';

export class RemoteConfigService {
  robotId!: string;
  streamUrl!: string;
  pins: PinConfig[] = [];
  audio: RobotConfig['audio'] = undefined;

  get videoWhipUrl(): string {
    return `${this.streamUrl}/robot/${this.robotId}/video/whip`;
  }

  get audioWhipUrl(): string {
    return `${this.streamUrl}/robot/${this.robotId}/audio/whip`;
  }

  constructor(private readonly socket: SocketService) {}

  async fetch(): Promise<void> {
    const res = await this.socket.rpc<RobotConfigGetResponse>(RobotConfigEvent.Get);
    if (res.error) throw new Error(res.error);
    this.robotId   = res.data!.robotId;
    this.streamUrl = res.data!.streamUrl;
    this.pins      = res.data!.config.pins ?? [];
    this.audio     = res.data!.config.audio;
    console.log('[RemoteConfigService] Config loaded', { robotId: this.robotId, videoWhipUrl: this.videoWhipUrl, audio: this.audio });
  }
}
