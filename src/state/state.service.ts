import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse, RobotState } from '@veezbot/robot-lib';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { RemoteConfigService } from '../config/remote-config.service';
import { ControlService } from '../control/control.service';
import { LatencyService } from '../latency/latency.service';
import { VideoService } from '../video/video.service';

type State = 'sleeping' | 'waking' | 'awake' | 'sleeping-down';

export class StateService {
  private state: State = 'sleeping';
  private queue: Promise<void> = Promise.resolve();

  get currentState(): RobotState {
    return this.state === 'awake' ? 'wake' : 'sleep';
  }

  constructor(
    socketService: SocketService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly control: ControlService,
    private readonly latency: LatencyService,
    private readonly video: VideoService,
    private readonly log: LogService,
    bus: BusService,
  ) {
    bus.on(BusEvent.SocketConnected,    () => this.enqueue(() => this.wake()));
    bus.on(BusEvent.SocketDisconnected, () => this.enqueue(() => this.sleep()));

    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (r: ActionExecuteResponse) => void) => {
      const actions: Partial<Record<string, () => void>> = {
        [Action.Wake]:  () => this.enqueue(async () => { await this.wake();  callback({ data: {} }); }),
        [Action.Sleep]: () => this.enqueue(async () => { await this.sleep(); callback({ data: {} }); }),
      };
      (actions[payload.action] ?? (() => callback({ error: `Unknown action: ${payload.action}` })))();
    });
  }

  private enqueue(fn: () => Promise<void>) {
    this.queue = this.queue.then(fn).catch(e => this.log.error(String(e)));
  }

  private async wake() {
    if (this.state === 'awake' || this.state === 'waking') return;
    this.state = 'waking';
    try {
      await this.remoteConfig.fetch();
      this.control.initPins();
      this.control.start();
      this.latency.start();
      await this.video.start();
      this.state = 'awake';
      this.log.info('Robot awake');
    } catch (e) {
      this.log.error(`Wake failed: ${e}`);
      this.state = 'sleeping';
    }
  }

  private async sleep() {
    if (this.state === 'sleeping' || this.state === 'sleeping-down') return;
    this.state = 'sleeping-down';
    this.log.info('Robot sleeping');
    try {
      this.latency.stop();
      await this.video.stop();
      this.control.stop();
    } finally {
      this.state = 'sleeping';
    }
  }
}
