import { RobotConfigEvent, RobotConfigSchema, type RobotConfig, type RobotStatus } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { RemoteConfigService } from '../config/remote-config.service';
import { HealthRegistry } from '../health/health.registry';
import type { Component, RuntimeConfig } from '../lifecycle';

export type Desired = 'awake' | 'asleep';
type Actual = 'sleeping' | 'waking' | 'awake' | 'stopping' | 'error';

/** A short drop (wifi blip, server redeploy) keeps the streams up: only the pins go back to rest at once. */
const DISCONNECT_GRACE_MS = 10_000;

/**
 * Owns wake/sleep. `desired` is what the server asked for and survives reconnections; `actual` is what the hardware
 * does. Every event only updates the inputs and calls `reconcile()`, which runs serialized and converges actual to
 * desired. A failed wake stays in error (reported, never retried by itself) until a new request: a Wake action,
 * a reconnection, a config update.
 */
export class StateService {
  private desired: Desired = 'awake';
  private actual:  Actual  = 'sleeping';
  private connected        = false;
  private graceTimer: NodeJS.Timeout | null = null;
  /** What telemetry keeps reporting while a wake runs: a retry from error must not flash 'awake' or 'sleeping'. */
  private wakingFrom: RobotStatus = 'sleeping';
  private reconcilePending = false;
  private wakeError: string | null = null;
  private running: RuntimeConfig | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    socket: SocketService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly components: Component[],
    private readonly onLinkLost: () => void,
    private readonly health: HealthRegistry,
    private readonly log: LogService,
  ) {
    socket.connected.register(() => {
      this.connected = true;
      this.clearGrace();
      void this.reconcile('connected');
    });
    socket.disconnected.register(() => {
      this.connected = false;
      this.onLinkLost();
      this.clearGrace();
      this.graceTimer = setTimeout(() => { this.graceTimer = null; void this.reconcile('disconnect grace over'); }, DISCONNECT_GRACE_MS);
      void this.reconcile('disconnected');
    });
    socket.handle(RobotConfigEvent.Update, RobotConfigSchema, (config) => this.onConfigUpdate(config));
  }

  get status(): RobotStatus {
    switch (this.actual) {
      case 'error':    return 'error';
      case 'waking':   return this.wakingFrom;
      case 'awake':    return this.health.ok ? 'awake' : 'error';
      case 'stopping': return 'sleeping';
      case 'sleeping': return this.connected ? 'sleeping' : 'connecting';
    }
  }

  get errors(): string[] {
    return this.health.errors;
  }

  /** Resolves once the hardware matches the request: null, or why a wake failed. */
  async request(desired: Desired, reason: string): Promise<string | null> {
    if (this.desired !== desired) this.log.info(`Desired → ${desired} (${reason})`);
    this.desired = desired;
    await this.reconcile(reason);
    return desired === 'awake' && this.actual === 'error' ? this.wakeError : null;
  }

  /** A config edited while awake applies at once: same config, nothing restarts (no stream blip). */
  private onConfigUpdate(config: RobotConfig) {
    if (!this.running || JSON.stringify(config) === JSON.stringify(this.running.config)) return;
    this.log.info('Config changed while awake: restarting');
    this.enqueue(async () => {
      if (this.actual !== 'awake') return;
      await this.sleep('config update');
      // wake() directly: a reconcile() from inside the queue would wait behind this very task.
      if (this.desired === 'awake' && this.connected) await this.wake('config update');
    });
  }

  private reconcile(reason: string): Promise<void> {
    // The server sends a Wake with every input while not awake: one pending reconcile covers them all, it reads the
    // inputs when it runs.
    if (this.reconcilePending) return this.queue;
    this.reconcilePending = true;
    return this.enqueue(async () => {
      this.reconcilePending = false;
      const wantAwake = this.desired === 'awake' && (this.connected || (this.graceTimer !== null && this.actual === 'awake'));
      if (wantAwake && this.actual !== 'awake') {
        if (this.connected) await this.wake(reason);
      } else if (!wantAwake && this.actual !== 'sleeping') {
        await this.sleep(reason);
      }
    });
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task).catch((e) => this.log.error(`Task failed: ${String(e)}`));
    return this.queue;
  }

  private setActual(actual: Actual) {
    this.actual = actual;
    this.log.info(`State → ${actual}`);
  }

  private async wake(reason: string) {
    this.log.info(`Waking (${reason})`);
    this.wakingFrom = this.actual === 'error' ? 'error' : 'sleeping';
    this.setActual('waking');
    this.health.clear();
    try {
      const config = await this.remoteConfig.fetch();
      for (const component of this.components) await component.start(config);
      this.running = config;
      this.setActual('awake');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Wake failed: ${message}`);
      await this.stopAll();
      this.wakeError = `Wake failed: ${message}`;
      this.health.set('wake', this.wakeError);
      this.setActual('error');
    }
  }

  private async sleep(reason: string) {
    this.log.info(`Sleeping (${reason})`);
    this.setActual('stopping');
    await this.stopAll();
    this.health.clear();
    this.setActual('sleeping');
  }

  private async stopAll() {
    this.running = null;
    await Promise.all(this.components.map((c) =>
      c.stop().catch((e) => this.log.error(`Stop failed (${c.name}): ${String(e)}`))));
  }

  private clearGrace() {
    if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null; }
  }
}
