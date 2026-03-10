import { bus } from './bus';
import { SocketModule } from './socket/socket';
import { SocketService } from './socket/socket.service';

export const socketService = new SocketService(bus);
new SocketModule(bus);