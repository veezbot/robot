import { LocalConfigService } from '../config/local-config.service';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';
import { HealthRegistry } from '../health/health.registry';
import { FfmpegStream, StreamSpec } from '../stream/ffmpeg-stream';
import type { Component, RuntimeConfig } from '../lifecycle';

const spec = (whipUrl: string, alsaDevice: string, token: string): StreamSpec => ({
  ffmpegArgs: ['-nostats', '-progress', 'pipe:1', '-f', 'alsa', '-ar', '48000', '-ac', '2', '-i', alsaDevice,
    '-af', 'aresample=async=1', '-c:a', 'libopus', '-b:a', '64k', '-application', 'lowdelay',
    '-authorization', token, '-f', 'whip', whipUrl],
});

export class AudioService implements Component {
  readonly name = 'audio';
  private readonly stream: FfmpegStream;

  constructor(
    private readonly localConfig: LocalConfigService,
    command: CommandService,
    health: HealthRegistry,
    private readonly log: LogService,
  ) {
    this.stream = new FfmpegStream(command, log, localConfig.mock);
    this.stream.error.register((message) => health.set(this.name, message));
  }

  async start(config: RuntimeConfig): Promise<void> {
    const audio = config.config.audio;
    if (!audio) {
      this.log.info('No audio configured, not started');
      return;
    }
    await this.stream.start(spec(config.audioWhipUrl, audio.alsaDevice, this.localConfig.token));
  }

  stop(): Promise<void> {
    return this.stream.stop();
  }
}
