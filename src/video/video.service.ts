import { LocalConfigService } from '../config/local-config.service';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';
import { HealthRegistry } from '../health/health.registry';
import { FfmpegStream, StreamSpec } from '../stream/ffmpeg-stream';
import type { Component, RuntimeConfig } from '../lifecycle';

const FPS = '30';
// A keyframe every 0.5 s: a new viewer can only start decoding on one (rpicam does not make one on demand).
const KEYFRAME_INTERVAL = String(Number(FPS) / 2);

const spec = (whipUrl: string, token: string): StreamSpec => ({
  source: {
    bin: 'rpicam-vid',
    args: ['-t', '0', '--codec', 'h264', '--width', '1296', '--height', '972', '--framerate', FPS, '--bitrate', '3000000',
      '--low-latency', '--profile', 'baseline', '--inline', '--intra', KEYFRAME_INTERVAL, '--flush', '-o', '-'],
  },
  ffmpegArgs: ['-nostats', '-progress', 'pipe:1', '-fflags', 'nobuffer+genpts+discardcorrupt', '-f', 'h264', '-r', FPS,
    '-i', '-', '-c:v', 'copy', '-map', '0:v', '-bsf:v', 'extract_extradata', '-ts_buffer_size', '2000000',
    '-authorization', token, '-f', 'whip', whipUrl],
});

export class VideoService implements Component {
  readonly name = 'video';
  private readonly stream: FfmpegStream;

  constructor(private readonly localConfig: LocalConfigService, command: CommandService, health: HealthRegistry, log: LogService) {
    this.stream = new FfmpegStream(command, log, localConfig.mock);
    this.stream.error.register((message) => health.set(this.name, message));
  }

  start(config: RuntimeConfig): Promise<void> {
    return this.stream.start(spec(config.videoWhipUrl, this.localConfig.token));
  }

  stop(): Promise<void> {
    return this.stream.stop();
  }
}
