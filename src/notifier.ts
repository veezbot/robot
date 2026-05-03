export class Notifier<T = void> {
  private readonly listeners = new Set<(payload: T) => void>();

  register(listener: (payload: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(payload: T): void {
    for (const listener of this.listeners) listener(payload);
  }
}
