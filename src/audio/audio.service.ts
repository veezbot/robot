import { ChildProcess } from 'child_process';
import { RemoteConfigService } from '../config/remote-config.service';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';

const MOCK          = process.env['MOCK'] === 'true';
const RESTART_DELAY = 3_000;
const KILL_CMD      = 'pkill -f "audio/whip"; true';
const STREAM_CMD    = (whipAudioUrl: string, alsaDevice: string) =>
  `ffmpeg-whip -f alsa -ar 48000 -ac 2 -i ${alsaDevice} -c:a libopus -b:a 64k -application lowdelay -f whip ${whipAudioUrl}`;

export class AudioService {
  private process:      ChildProcess | null = null;
  private active      = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly remoteConfig: RemoteConfigService,
    private readonly command: CommandService,
    private readonly log: LogService,
  ) {}

  async start(): Promise<void> {
    if (!this.remoteConfig.audio) return;
    this.active = true;
    if (MOCK) {
      this.log.info('Audio stream: mock mode, skipping');
      return;
    }
    await this.stop();
    this.active = true;
    this.log.info(`Starting audio stream (${this.remoteConfig.audio.alsaDevice})`);
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
    this.log.info(`Restarting audio stream in ${RESTART_DELAY}ms`);
    this.restartTimer = setTimeout(() => { this.restartTimer = null; if (this.active) this.spawnProcess(); }, RESTART_DELAY);
  }

  private spawnProcess() {
    const { alsaDevice } = this.remoteConfig.audio!;
    this.process = this.command.spawn(STREAM_CMD(this.remoteConfig.whipAudioUrl, alsaDevice));

    this.process.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        const t = line.trim();
        if (t && !/^#\d+/.test(t) && !/^frame=/.test(t)) this.log.info(`[ffmpeg-audio] ${t}`);
      }
    });

    this.process.on('close', (code) => {
      this.process = null;
      if (code !== 0 && code !== null) {
        this.log.error(`Audio stream crashed (code ${code})`);
        this.scheduleRestart();
      } else {
        this.log.info('Audio stream ended');
      }
    });

    this.process.on('error', (err) => {
      this.process = null;
      this.log.error(`Audio stream error: ${err.message}`);
      this.scheduleRestart();
    });
  }
}
