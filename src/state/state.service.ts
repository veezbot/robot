import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse } from '@veezbot/lib';
import { LogService } from '../log/log.service';
import { SocketService } from '../socket/socket.service';
import { VideoService } from '../video/video.service';

export class StateService {
  constructor(
    private readonly socketService: SocketService,
    private readonly video: VideoService,
    private readonly log: LogService,
  ) {
    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) => {
      this.execute(payload, callback);
    });
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

  private wake(callback: (result: ActionExecuteResponse) => void) {
    this.video.start();
    // TODO: start GPIOs
    this.log.info('Robot waking up');
    callback({ data: {} });
  }

  private async sleep(callback: (result: ActionExecuteResponse) => void) {
    await this.video.stop();
    // TODO: stop GPIOs
    this.log.info('Robot sleeping');
    callback({ data: {} });
  }
}
