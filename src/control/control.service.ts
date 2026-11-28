import { RobotControlEvent, RobotPinOutputPayloadSchema, type PinCommand } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import type { Component, RuntimeConfig } from '../lifecycle';
import { Pin } from './pin';

/** The server pings every second: past this, the link is gone and the pins go back to rest. */
const FAILSAFE_MS = 1500;

export class ControlService implements Component {
  readonly name = 'control';

  private readonly pins = new Map<number, Pin>();
  private readonly rejected = new Set<string>();
  private active   = false;
  private failsafe: NodeJS.Timeout | null = null;

  constructor(socket: SocketService, private readonly log: LogService) {
    socket.heartbeat.register(() => { if (this.active) this.armFailsafe(); });
    socket.handle(RobotControlEvent.Pins, RobotPinOutputPayloadSchema, ({ pins }) => this.apply(pins));
  }

  async start(config: RuntimeConfig): Promise<void> {
    this.pins.clear();
    this.rejected.clear();
    for (const pinConfig of config.config.pins ?? []) {
      const pin = new Pin(pinConfig);
      pin.rest();
      this.pins.set(pinConfig.pin, pin);
    }
    this.active = true;
    // Armed now, not on the first ping: a link that dies right after the wake still brings the pins back to rest.
    this.armFailsafe();
    this.log.info(`Started, pins: ${[...this.pins].map(([n, p]) => `${n}(${p.op})`).join(', ') || 'none'}`);
  }

  async stop(): Promise<void> {
    this.active = false;
    this.clearFailsafe();
    this.rest();
    this.log.info('Stopped');
  }

  /** Link lost: pins to rest now, without waiting for the failsafe. Stays active for when the link comes back. */
  halt() {
    if (!this.active) return;
    this.clearFailsafe();
    this.rest();
    this.log.info('Halted (link lost)');
  }

  private apply(commands: PinCommand[]) {
    if (!this.active) return;
    for (const cmd of commands) {
      const pin = this.pins.get(cmd.pin);
      // Only the configured pins, with their configured op: the server never drives an arbitrary GPIO.
      if (!pin || pin.op !== cmd.op) {
        const key = `${cmd.pin}:${cmd.op}`;
        if (!this.rejected.has(key)) { this.rejected.add(key); this.log.warn(`Rejected command for unconfigured pin ${key}`); }
        continue;
      }
      pin.apply(cmd);
    }
  }

  private armFailsafe() {
    this.clearFailsafe();
    this.failsafe = setTimeout(() => {
      this.failsafe = null;
      this.log.warn('Failsafe triggered: pins back to rest');
      this.rest();
    }, FAILSAFE_MS);
  }

  private clearFailsafe() {
    if (this.failsafe) { clearTimeout(this.failsafe); this.failsafe = null; }
  }

  private rest() {
    for (const [n, pin] of this.pins) {
      try { pin.rest(); } catch (e) { this.log.error(`Pin ${n} rest failed: ${String(e)}`); }
    }
  }
}
