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

const bus          = new BusService();
const localConfig  = new LocalConfigService();
const socket       = new SocketService(bus, localConfig);
const command      = new CommandService();
const remoteConfig = new RemoteConfigService(socket);
const video        = new VideoService(remoteConfig, command, log);
const control      = new ControlService(socket, bus, remoteConfig, log);
const latency      = new LatencyService(socket, bus);
const state        = new StateService(socket, remoteConfig, control, latency, video, log, bus);
new TelemetryService(socket, state, bus);
new ChatService(socket, log);
