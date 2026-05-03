import { RobotConfigEvent, type PinConfig, type RobotConfig, type WsResponse, type RobotConfigInit } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';

export class RemoteConfigService {
  robotId!: string;
  videoWhipUrl!: string;
  audioWhipUrl!: string;
  pins: PinConfig[] = [];
  audio: RobotConfig['audio'] = undefined;

  constructor(private readonly socket: SocketService) {}

  async fetch(): Promise<void> {
    const res = await this.socket.rpc<WsResponse<RobotConfigInit>>(RobotConfigEvent.Get);
    if (res.error) throw new Error(res.error);
    this.robotId      = res.data!.robotId;
    this.videoWhipUrl = res.data!.videoWhipUrl;
    this.audioWhipUrl = res.data!.audioWhipUrl;
    this.pins         = res.data!.config.pins ?? [];
    this.audio        = res.data!.config.audio;
    console.log('[RemoteConfigService] Config loaded', { robotId: this.robotId, videoWhipUrl: this.videoWhipUrl, audio: this.audio });
  }
}
