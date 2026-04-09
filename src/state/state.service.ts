import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse, RobotStatus } from '@veezbot/robot-lib';
import { BusService } from '../bus/bus.service';
import { BusEvent } from '../bus/bus.events';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { RemoteConfigService } from '../config/remote-config.service';
import { ControlService } from '../control/control.service';
import { VideoService } from '../video/video.service';

type State = 'sleeping' | 'waking' | 'awake' | 'sleeping-down' | 'error';

export class StateService {
  private _state:    State   = 'sleeping';
  private connected          = false;
  private queue: Promise<void> = Promise.resolve();
  lastError: string | null   = null;

  private get state()        { return this._state; }
  private set state(s: State) { this._state = s; this.log.info(`State → ${s}`); }

  get status(): RobotStatus {
    if (this.state === 'awake'  || this.state === 'waking')        return 'awake';
    if (this.state === 'error')                                    return 'error';
    if (this.state === 'sleeping-down' || this.connected)          return 'sleeping';
    return 'connecting';
  }

  constructor(
    socketService: SocketService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly control: ControlService,
    private readonly video: VideoService,
    private readonly log: LogService,
    bus: BusService,
  ) {
    bus.on(BusEvent.SocketConnected,    () => { this.connected = true;  this.enqueue(() => this.wake());  });
    bus.on(BusEvent.SocketDisconnected, () => { this.connected = false; this.enqueue(() => this.sleep()); });

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
    this.lastError = null;
    try {
      await this.remoteConfig.fetch();
      this.control.initPins();
      this.control.start();
      await this.video.start();
      this.state = 'awake';
    } catch (e) {
      this.lastError = String(e);
      this.log.error(`Wake failed: ${this.lastError}`);
      this.state = 'error';
    }
  }

  private async sleep() {
    if (this.state === 'sleeping' || this.state === 'sleeping-down') return;
    this.state = 'sleeping-down';
    try {
      await this.video.stop();
      this.control.stop();
    } finally {
      this.state = 'sleeping';
    }
  }
}
