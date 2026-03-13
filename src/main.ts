import { BusService } from './bus/bus.service';
import { CommandService } from './command/command.service';
import { LocalConfigService } from './config/local-config.service';
import { RemoteConfigService } from './config/remote-config.service';
import { LogService } from './log/log.service';
import { SocketService } from './socket/socket.service';
import { StateService } from './state/state.service';
import { VideoService } from './video/video.service';

const bus = new BusService();
const localConfig = new LocalConfigService();
const socketService = new SocketService(bus, localConfig);
const command = new CommandService();
const log = new LogService();
const remoteConfig = new RemoteConfigService(socketService, localConfig, bus);
const video = new VideoService(remoteConfig, command, log);
new StateService(socketService, video, log, bus);