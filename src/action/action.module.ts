import { Action, ActionEvent, ActionExecutePayload, ActionExecuteResponse } from '@veezbot/lib';
import { WHIP_URL } from '../config/config';
import { CommandModule } from '../command/command.module';
import { LogModule } from '../log/log.module';
import { SocketService } from '../socket/socket.service';

type ArgDef = { flag: string } | { positional: true };

type ActionDef = {
  allowedArgs?: Record<string, ArgDef>;
};

const ACTIONS: Record<string, ActionDef> = {
  [Action.Wake]: {},
  [Action.Sleep]: {},
};

function resolveArgs(def: ActionDef, args: Record<string, string>): string[] | { error: string } {
  const flagArgs: string[] = [];
  const positionalArgs: string[] = [];

  for (const [key, value] of Object.entries(args)) {
    const allowed = def.allowedArgs?.[key];
    if (!allowed) return { error: `Unknown arg: ${key}` };
    if ('positional' in allowed) positionalArgs.push(value);
    else flagArgs.push(allowed.flag, value);
  }

  return [...flagArgs, ...positionalArgs];
}

export class ActionModule {
  constructor(
    socketService: SocketService,
    private readonly command: CommandModule,
    private readonly log: LogModule,
  ) {
    socketService.on(ActionEvent.Execute, (payload: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) => {
      this.execute(payload, callback);
    });
  }

  private execute({ action, args = {} }: ActionExecutePayload, callback: (result: ActionExecuteResponse) => void) {
    const def = ACTIONS[action];
    if (!def) { callback({ error: `Unknown action: ${action}` }); return; }

    const resolved = resolveArgs(def, args);
    if ('error' in resolved) { callback(resolved); return; }

    const handlers: Record<string, (resolvedArgs: string[]) => void> = {
      [Action.Wake]: (a) => this.wake(a, callback),
      [Action.Sleep]: () => this.sleep(callback),
    };

    handlers[action](resolved);
  }

  private wake(args: string[], callback: (result: ActionExecuteResponse) => void) {
    this.command.run(
      `rpicam-vid -t 0 --codec h264 --width 640 --height 480 --framerate 24 --bitrate 1000000 --profile baseline --inline --intra 24 --flush -o - | ffmpeg-whip -fflags nobuffer+genpts+discardcorrupt -f h264 -r 24 -i - -c:v copy -map 0:v -bsf:v extract_extradata -ts_buffer_size 2000000 -f whip ${WHIP_URL}`,
    ).then(() => this.log.info('Video stream ended'));
    // TODO: start GPIOs
    this.log.info('Robot waking up');
    callback({ data: {} });
  }

  private async sleep(callback: (result: ActionExecuteResponse) => void) {
    await this.command.run('pkill -f rpicam-vid');
    // TODO: stop GPIOs
    this.log.info('Robot sleeping');
    callback({ data: {} });
  }
}
