import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse, RobotState } from '@veezbot/robot-lib';
import { BusService } from '../bus/bus.service';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { BusEvent } from '../bus/bus.events';
import { VideoService } from '../video/video.service';
import { ControlService } from '../control/control.service';

export class StateService {
  currentState: RobotState = 'sleep';

  constructor(
    socketService: SocketService,
    private readonly video: VideoService,
    private readonly control: ControlService,
    private readonly log: LogService,
    bus: BusService,
  ) {
    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) => {
      this.execute(payload, callback);
    });

    bus.on(BusEvent.ConfigReady, () => this.wake());
    bus.on(BusEvent.SocketDisconnected, () => this.sleep());
  }

  private execute({ action }: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) {
    const handlers: Partial<Record<string, () => void>> = {
      [Action.Wake]: () => this.wake(callback),
      [Action.Sleep]: () => this.sleep(callback),
    };

    const handler = handlers[action];
    if (!handler) { callback({ error: `Unknown action: ${action}` }); return; }

    handler();
  }

  private wake(callback?: (result: ActionExecuteResponse) => void) {
    this.log.info('Robot waking up');
    this.currentState = 'wake';
    this.control.start();
    this.video.start();
    callback?.({ data: {} });
  }

  private async sleep(callback?: (result: ActionExecuteResponse) => void) {
    this.log.info('Robot sleeping');
    this.currentState = 'sleep';
    await this.video.stop();
    this.control.stop();
    callback?.({ data: {} });
  }
}
