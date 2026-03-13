import { ActionModule } from './action/action.module';
import { bus } from './bus';
import { CommandModule } from './command/command.module';
import { LogModule } from './log/log.module';
import { SocketModule } from './socket/socket';
import { SocketService } from './socket/socket.service';

const socketService = new SocketService(bus);
const command = new CommandModule();
const log = new LogModule();

new SocketModule(bus);
new ActionModule(socketService, command, log);