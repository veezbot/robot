/** Current problems, one per kind (video, audio, wake…): reported in telemetry, and the reason for an 'error' status. */
export class HealthRegistry {
  private readonly problems = new Map<string, string>();

  set(kind: string, message: string | null) {
    if (message) this.problems.set(kind, message);
    else         this.problems.delete(kind);
  }

  clear() {
    this.problems.clear();
  }

  get ok(): boolean {
    return this.problems.size === 0;
  }

  get errors(): string[] {
    return [...this.problems.values()];
  }
}
