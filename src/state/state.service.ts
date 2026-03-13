import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse } from '@veezbot/lib';
import { BusService } from '../bus/bus.service';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { SocketEvent } from '../socket/socket.events';
import { VideoService } from '../video/video.service';

export class StateService {
  constructor(
    socketService: SocketService,
    private readonly video: VideoService,
    private readonly log: LogService,
    bus: BusService,
  ) {
    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) => {
      this.execute(payload, callback);
    });

    bus.on(SocketEvent.ConfigReady, () => this.wake());
    bus.on(SocketEvent.Disconnected, () => this.sleep());
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
    this.video.start();
    // TODO: start GPIOs
    callback?.({ data: {} });
  }

  private async sleep(callback?: (result: ActionExecuteResponse) => void) {
    this.log.info('Robot sleeping');
    await this.video.stop();
    // TODO: stop GPIOs
    callback?.({ data: {} });
  }
}
