import { ChildProcess } from 'child_process';
import { RemoteConfigService } from '../config/remote-config.service';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';

const MOCK          = process.env['MOCK'] === 'true';
const RESTART_DELAY = 3_000;
const KILL_CMD      = 'pkill -f rpicam-vid; pkill -f ffmpeg-whip; pkill -f libcamera; true';
const STREAM_CMD    = (whipUrl: string) =>
  `rpicam-vid -t 0 --codec h264 --width 640 --height 480 --framerate 24 --bitrate 1000000 --low-latency --profile baseline --inline --intra 24 --flush -o - | ffmpeg-whip -fflags nobuffer+genpts+discardcorrupt -f h264 -r 24 -i - -c:v copy -map 0:v -bsf:v extract_extradata -ts_buffer_size 2000000 -f whip ${whipUrl}`;

export class VideoService {
  private process:      ChildProcess | null = null;
  private active      = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly remoteConfig: RemoteConfigService,
    private readonly command: CommandService,
    private readonly log: LogService,
  ) {}

  async start(): Promise<void> {
    this.active = true;
    if (MOCK) {
      this.log.info('Video stream: mock mode, skipping');
      return;
    }
    await this.stop();
    this.active = true;
    this.log.info('Starting video stream');
    this.spawnProcess();
  }

  async stop(): Promise<void> {
    this.active = false;
    this.process = null;
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    await this.command.run(KILL_CMD);
  }

  private scheduleRestart() {
    if (!this.active) return;
    this.log.info(`Restarting video stream in ${RESTART_DELAY}ms`);
    this.restartTimer = setTimeout(() => { this.restartTimer = null; if (this.active) this.spawnProcess(); }, RESTART_DELAY);
  }

  private spawnProcess() {
    this.process = this.command.spawn(STREAM_CMD(this.remoteConfig.videoWhipUrl));

    this.process.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        const t = line.trim();
        if (t && !/^#\d+/.test(t) && !/^frame=/.test(t)) this.log.info(`[ffmpeg-video] ${t}`);
      }
    });

    this.process.on('close', (code) => {
      this.process = null;
      if (code !== 0 && code !== null) {
        this.log.error(`Video stream crashed (code ${code})`);
        this.scheduleRestart();
      } else {
        this.log.info('Video stream ended');
      }
    });

    this.process.on('error', (err) => {
      this.process = null;
      this.log.error(`Video stream error: ${err.message}`);
      this.scheduleRestart();
    });
  }

}
