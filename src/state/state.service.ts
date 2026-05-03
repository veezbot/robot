import { Action, ActionEvent, type ActionExecutePayload, type WsResponse, RobotStatus } from '@veezbot/robot-lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { RemoteConfigService } from '../config/remote-config.service';
import { ControlService } from '../control/control.service';
import { VideoService } from '../video/video.service';
import { AudioService } from '../audio/audio.service';
import { CommandService } from '../command/command.service';

type State = 'sleeping' | 'waking' | 'awake' | 'sleeping-down' | 'error';

export class StateService {
  private _state:  State = 'sleeping';
  private connected     = false;
  private queue: Promise<void> = Promise.resolve();
  private _errors: Partial<Record<string, string>> = {};

  private get state()         { return this._state; }
  private set state(s: State) { this._state = s; this.log.info(`State → ${s}`); }

  get errors(): string[] { return Object.values(this._errors) as string[]; }

  get status(): RobotStatus {
    if (this.state === 'error')                                return 'error';
    if (this.state === 'awake' || this.state === 'waking')    return this.errors.length > 0 ? 'error' : 'awake';
    if (this.state === 'sleeping-down' || this.connected)     return 'sleeping';
    return 'connecting';
  }

  constructor(
    socketService: SocketService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly control: ControlService,
    private readonly video: VideoService,
    private readonly audio: AudioService,
    private readonly log: LogService,
    private readonly command: CommandService,
  ) {
    socketService.connected.register(()    => { this.connected = true;  this.enqueue(() => this.wake());  });
    socketService.disconnected.register(() => { this.connected = false; this.enqueue(() => this.sleep()); });

    const onError = ({ kind, message }: { kind: string; message: string | null }) => {
      if (this.state !== 'awake') return;
      if (message) this._errors[kind] = message;
      else         delete this._errors[kind];
    };
    video.error.register(onError);
    audio.error.register(onError);

    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (r: WsResponse<Record<string, unknown>>) => void) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const actions: Partial<Record<string, () => void>> = {
        [Action.Wake]: () => this.enqueue(async () => { await this.wake();  ack({ data: {} }); }),
        [Action.Sleep]: () => this.enqueue(async () => { await this.sleep(); ack({ data: {} }); }),
        [Action.RebootClient]: () => this.enqueue(async () => { await this.sleep(); ack({ data: {} }); setTimeout(() => process.exit(0), 500); }),
        [Action.RebootSystem]: () => this.enqueue(async () => { await this.sleep(); ack({ data: {} }); setTimeout(() => this.command.run('sudo reboot'), 500); }),
      };
      (actions[payload.action] ?? (() => ack({ error: `Unknown action: ${payload.action}` })))();
    });
  }

  private enqueue(fn: () => Promise<void>) {
    this.queue = this.queue.then(fn).catch(e => this.log.error(String(e)));
  }

  private async wake() {
    if (this.state === 'awake' || this.state === 'waking') return;
    this.state = 'waking';
    this._errors = {};
    try {
      await this.remoteConfig.fetch();
      this.control.initPins();
      this.control.start();
      await this.video.start();
      await this.audio.start();
      this.state = 'awake';
    } catch (e) {
      this._errors['wake'] = String(e);
      this.log.error(`Wake failed: ${this._errors['wake']}`);
      this.state = 'error';
    }
  }

  private async sleep() {
    if (this.state === 'sleeping' || this.state === 'sleeping-down') return;
    this.state = 'sleeping-down';
    try {
      await this.video.stop();
      await this.audio.stop();
      this.control.stop();
    } finally {
      this.state = 'sleeping';
    }
  }
}
