import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { LogService } from '../log/log.service';

export type RunResult = { stdout: string; stderr: string; code: number | null } | { error: string };

/** Arguments that follow these flags never reach the logs. */
const SECRET_FLAGS = new Set(['-authorization']);

/** Child processes without a shell: every argument goes through as is, nothing a server value can escape from. */
export class CommandService {
  constructor(private readonly log: LogService) {}

  run(bin: string, args: string[] = []): Promise<RunResult> {
    return new Promise((resolve) => {
      const proc = this.spawn(bin, args);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, code }));
      proc.on('error', (err) => resolve({ error: err.message }));
    });
  }

  spawn(bin: string, args: string[] = [], options: SpawnOptions = {}): ChildProcess {
    this.log.info(`Spawning: ${[bin, ...mask(args)].join(' ')}`);
    return spawn(bin, args, options);
  }
}

function mask(args: string[]): string[] {
  return args.map((arg, i) => (i > 0 && SECRET_FLAGS.has(args[i - 1]) ? '***' : arg));
}
