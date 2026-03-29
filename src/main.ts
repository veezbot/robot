import { execSync } from 'child_process';
import { VERSION_DISPLAY } from './version';
import { BusService } from './bus/bus.service';
import { CommandService } from './command/command.service';
import { ControlService } from './control/control.service';
import { LocalConfigService } from './config/local-config.service';
import { RemoteConfigService } from './config/remote-config.service';
import { LogService } from './log/log.service';
import { SocketService } from './socket/socket.service';
import { StateService } from './state/state.service';
import { TelemetryService } from './telemetry/telemetry.service';
import { VideoService } from './video/video.service';
import { ChatService } from './chat/chat.service';
import { LatencyService } from './latency/latency.service';

const log = new LogService();
log.info(`VeezBot Robot ${VERSION_DISPLAY}`);

// Kill any orphan camera processes from previous runs before acquiring the hardware
try { execSync('pkill -f rpicam-vid; pkill -f ffmpeg-whip; pkill -f libcamera'); } catch {}

const bus = new BusService();
const localConfig = new LocalConfigService();
const socketService = new SocketService(bus, localConfig);
const command = new CommandService();
const remoteConfig = new RemoteConfigService(socketService, bus);
const video = new VideoService(remoteConfig, command, bus, log);
const control = new ControlService(socketService, bus, remoteConfig, log);
const stateService = new StateService(socketService, video, control, log, bus);
new LatencyService(socketService, bus);
new TelemetryService(socketService, stateService);
new ChatService(socketService, log);
