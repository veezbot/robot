import { ChildProcess } from 'child_process';
import { RemoteConfigService } from '../config/remote-config.service';
import { CommandService } from '../command/command.service';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { LogService } from '../log/log.service';

const FAILSAFE_MS = 2000;

export class VideoService {
  private process:  ChildProcess | null = null;
  private active    = false;
  private failsafe: NodeJS.Timeout | null = null;

  constructor(
    private readonly remoteConfig: RemoteConfigService,
    private readonly command: CommandService,
    bus: BusService,
    private readonly log: LogService,
  ) {
    bus.on(BusEvent.Heartbeat, () => {
      if (!this.active) return;
      this.resetFailsafe();
      if (!this.process) {
        this.log.info('Video stream: heartbeat resumed, restarting');
        this.spawnProcess();
      }
    });
  }

  async start(): Promise<void> {
    this.active = true;
    if (this.process) {
      this.log.info('Video stream already running');
      return;
    }
    await this.command.run('pkill -f rpicam-vid; pkill -f ffmpeg-whip; pkill -f libcamera; true');
    this.log.info('Starting video stream');
    this.spawnProcess();
    this.resetFailsafe();
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.failsafe) {
      clearTimeout(this.failsafe);
      this.failsafe = null;
    }
    if (!this.process) {
      this.log.info('No video stream to stop');
      return;
    }
    await this.command.run('pkill -f rpicam-vid; pkill -f ffmpeg-whip; pkill -f libcamera; true');
  }

  private spawnProcess() {
    this.process = this.command.spawn(
      `rpicam-vid -t 0 --codec h264 --width 640 --height 480 --framerate 24 --bitrate 1000000 --profile baseline --inline --intra 24 --flush -o - | ffmpeg-whip -fflags nobuffer+genpts+discardcorrupt -f h264 -r 24 -i - -c:v copy -map 0:v -bsf:v extract_extradata -ts_buffer_size 2000000 -f whip ${this.remoteConfig.whipUrl}`,
    );

    this.process.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        const t = line.trim();
        if (t && !/^#\d+/.test(t) && !/^frame=/.test(t)) this.log.info(`[ffmpeg] ${t}`);
      }
    });

    this.process.on('close', (code) => {
      this.process = null;
      if (code !== 0 && code !== null) {
        this.log.error(`Video stream crashed (code ${code})`);
      } else {
        this.log.info('Video stream ended');
      }
    });

    this.process.on('error', (err) => {
      this.process = null;
      this.log.error(`Video stream error: ${err.message}`);
    });
  }

  private resetFailsafe() {
    if (this.failsafe) clearTimeout(this.failsafe);
    this.failsafe = setTimeout(() => {
      this.failsafe = null;
      this.log.warn('Video failsafe triggered — stopping stream');
      this.command.run('pkill -f rpicam-vid; pkill -f ffmpeg-whip; pkill -f libcamera; true');
      this.process = null;
    }, FAILSAFE_MS);
  }
}
