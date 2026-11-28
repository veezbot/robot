import { ChildProcess } from 'child_process';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';
import { Notifier } from '../notifier';

const FFMPEG        = 'ffmpeg-whip';
const RESTART_DELAY = 3_000;
const KILL_TIMEOUT  = 3_000;
const STALL_TIMEOUT = 15_000;

export interface StreamSpec {
  /** A producer piped into ffmpeg's stdin (`-i -`). */
  source?: { bin: string; args: string[] };
  /** ffmpeg arguments, `-nostats -progress pipe:1` first: the stall watchdog reads that output. */
  ffmpegArgs: string[];
}

/** One launch: the processes of the pipeline, all killed together, any exit ending it. */
interface Run {
  readonly procs: ChildProcess[];
}

/** A WHIP publisher kept alive: restarted when it exits, and when it stops progressing. */
export class FfmpegStream {
  private run:          Run | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private stallTimer:   NodeJS.Timeout | null = null;

  /** `null` once a (re)start is under way: the problem is cleared until the next one. */
  readonly error = new Notifier<string | null>();

  constructor(
    private readonly command: CommandService,
    private readonly log: LogService,
    private readonly mock: boolean,
  ) {}

  async start(spec: StreamSpec): Promise<void> {
    await this.stop();
    if (this.mock) {
      this.log.info('Mock mode, not started');
      return;
    }
    this.log.info('Starting');
    this.launch(spec);
  }

  async stop(): Promise<void> {
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    this.clearStallTimer();
    const run = this.run;
    this.run = null;
    if (run) {
      await Promise.all(run.procs.map((p) => this.kill(p)));
      this.log.info('Stopped');
    }
  }

  private launch(spec: StreamSpec) {
    this.error.emit(null);

    const source = spec.source && this.command.spawn(spec.source.bin, spec.source.args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const ffmpeg = this.command.spawn(FFMPEG, spec.ffmpegArgs, { stdio: [source ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    if (source) {
      // Either side dying breaks the pipe: an EPIPE left unhandled would crash the process, the 'close' handles it.
      ffmpeg.stdin?.on('error', () => {});
      source.stdout?.on('error', () => {});
      source.stdout?.pipe(ffmpeg.stdin!);
    }

    const run: Run = { procs: source ? [source, ffmpeg] : [ffmpeg] };
    this.run = run;

    // A publisher whose server went away stays alive without a word: only its progress tells.
    // No single counter moves for every stream: a copied raw H.264 one has no usable out_time, audio has no frame.
    let progress = '';
    ffmpeg.stdout?.on('data', (data: Buffer) => {
      const latest = (data.toString().match(/^(frame|total_size|out_time_us)=\d+/gm) ?? []).join();
      if (this.run !== run || !latest || latest === progress) return;
      progress = latest;
      this.armStallTimer(run, spec);
    });

    for (const proc of run.procs) {
      const name = proc === ffmpeg ? FFMPEG : spec.source!.bin;
      proc.stderr?.on('data', (data: Buffer) => {
        for (const line of data.toString().split('\n')) {
          const t = line.trim();
          if (t && !/^#\d+/.test(t)) this.log.info(`[${name}] ${t}`);
        }
      });
      proc.on('close', (code, signal) => this.onEnd(run, spec, `${name} exited (${signal ?? `code ${code}`})`));
      proc.on('error', (err) => this.onEnd(run, spec, `${name} failed: ${err.message}`));
    }

    this.armStallTimer(run, spec);
  }

  private armStallTimer(run: Run, spec: StreamSpec) {
    this.clearStallTimer();
    this.stallTimer = setTimeout(() => this.onEnd(run, spec, `stalled for ${STALL_TIMEOUT}ms`), STALL_TIMEOUT);
  }

  private clearStallTimer() {
    if (this.stallTimer) { clearTimeout(this.stallTimer); this.stallTimer = null; }
  }

  private onEnd(run: Run, spec: StreamSpec, reason: string) {
    // Stopped or already replaced: nothing to restart.
    if (this.run !== run) return;
    this.run = null;
    this.clearStallTimer();
    // The rest of the pipeline may still be running: it goes too before the relaunch.
    for (const proc of run.procs) void this.kill(proc);
    this.log.error(reason);
    this.error.emit(reason);
    this.log.info(`Restarting in ${RESTART_DELAY}ms`);
    this.restartTimer = setTimeout(() => { this.restartTimer = null; this.launch(spec); }, RESTART_DELAY);
  }

  private kill(proc: ChildProcess): Promise<void> {
    if (proc.exitCode !== null || proc.signalCode !== null || !proc.pid) return Promise.resolve();
    return new Promise((resolve) => {
      const force = setTimeout(() => proc.kill('SIGKILL'), KILL_TIMEOUT);
      proc.once('close', () => { clearTimeout(force); resolve(); });
      proc.kill('SIGTERM');
    });
  }
}
