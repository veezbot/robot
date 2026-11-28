import { Action, ActionEvent, ActionExecutePayloadSchema } from '@veezbot/robot-lib';
import { SocketService, type Ack } from '../socket/socket.service';
import { StateService } from '../state/state.service';
import { LogService } from '../log/log.service';

/** Leaves the ack time to reach the server before the process or the system goes down. */
const EXIT_DELAY_MS = 500;

export class ActionService {
  constructor(
    socket: SocketService,
    private readonly state: StateService,
    private readonly shutdown: (reason: string, then: 'exit' | 'reboot') => Promise<void>,
    private readonly log: LogService,
  ) {
    socket.handle(ActionEvent.Execute, ActionExecutePayloadSchema, ({ action }, ack) => this.execute(action, ack));
  }

  private async execute(action: string, ack: Ack) {
    this.log.info(`Action: ${action}`);
    switch (action) {
      case Action.Wake: {
        // Acked once the attempt is over: the owner who pressed Wake is told when it fails.
        const error = await this.state.request('awake', 'wake action');
        ack(error ? { error } : { data: {} });
        return;
      }
      case Action.Sleep:
        ack({ data: {} });
        await this.state.request('asleep', 'sleep action');
        return;
      case Action.RebootClient:
      case Action.RebootSystem:
        await this.state.request('asleep', `${action} action`);
        ack({ data: {} });
        setTimeout(() => void this.shutdown(`${action} action`, action === Action.RebootSystem ? 'reboot' : 'exit'), EXIT_DELAY_MS);
        return;
      default:
        this.log.warn(`Unknown action: ${action}`);
        ack({ error: `Unknown action: ${action}` });
    }
  }
}
