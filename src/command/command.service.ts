import { spawn } from 'child_process';

export type RunResult = { stdout: string; stderr: string; code: number | null } | { error: string };

export class CommandService {
  run(cmd: string): Promise<RunResult> {
    return new Promise((resolve) => {
      console.log(`[CommandService] Running: ${cmd}`);
      const proc = spawn('sh', ['-c', cmd]);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, code }));
      proc.on('error', (err) => resolve({ error: err.message }));
    });
  }
}
