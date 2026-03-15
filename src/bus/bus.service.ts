import { EventEmitter } from 'events';

export class BusService {
  private readonly emitter = new EventEmitter();

  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler);
  }

  emit(event: string, data?: unknown) {
    this.emitter.emit(event, data);
    console.log(`[BusService] ${event}`);
  }
}
