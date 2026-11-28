export class LogService {
  constructor(private readonly scope?: string) {}

  /** Same output, every line prefixed with `[scope]`. */
  child(scope: string): LogService {
    return new LogService(this.scope ? `${this.scope}:${scope}` : scope);
  }

  info(message: string) {
    console.log(this.format('INFO ', message));
  }

  warn(message: string) {
    console.warn(this.format('WARN ', message));
  }

  error(message: string) {
    console.error(this.format('ERROR', message));
  }

  private format(level: string, message: string): string {
    return `[${new Date().toISOString()}] ${level} ${this.scope ? `[${this.scope}] ` : ''}${message}`;
  }
}
