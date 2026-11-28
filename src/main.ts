import { spawnSync } from 'child_process';
import { VERSION_DISPLAY } from './version';
import { LogService } from './log/log.service';
import { LocalConfigService } from './config/local-config.service';
import { initGpio, terminateGpio } from './control/gpio-factory';
import { openBattery } from './telemetry/battery';
import { CommandService } from './command/command.service';
import { SocketService } from './socket/socket.service';
import { RemoteConfigService } from './config/remote-config.service';
import { HealthRegistry } from './health/health.registry';
import { ControlService } from './control/control.service';
import { VideoService } from './video/video.service';
import { AudioService } from './audio/audio.service';
import { StateService } from './state/state.service';
import { ActionService } from './action/action.service';
import { TelemetryService } from './telemetry/telemetry.service';
import { ChatService } from './chat/chat.service';

/** Past this, a stuck teardown no longer holds the exit (systemd would SIGKILL us later anyway). */
const SHUTDOWN_TIMEOUT_MS = 8_000;

const log = new LogService();
log.info(`VeezBot Robot ${VERSION_DISPLAY}`);

const localConfig = new LocalConfigService(log.child('config'));
initGpio(localConfig.mock, log.child('gpio'));

// Publishers a crash or a SIGKILL left behind still hold the camera. No shell: pkill never matches itself.
for (const pattern of ['rpicam-vid', 'ffmpeg-whip', 'libcamera']) spawnSync('pkill', ['-f', pattern]);

const health       = new HealthRegistry();
const command      = new CommandService(log.child('command'));
const socket       = new SocketService(localConfig, log.child('socket'));
const remoteConfig = new RemoteConfigService(socket, log.child('remote-config'));
const control      = new ControlService(socket, log.child('control'));
const video        = new VideoService(localConfig, command, health, log.child('video'));
const audio        = new AudioService(localConfig, command, health, log.child('audio'));
const state        = new StateService(socket, remoteConfig, [control, video, audio], () => control.halt(), health, log.child('state'));
new ActionService(socket, state, shutdown, log.child('action'));
new TelemetryService(socket, state, localConfig.mock ? null : openBattery(log.child('battery')), log.child('telemetry'));
new ChatService(socket, command, log.child('chat'));

let shuttingDown = false;

async function shutdown(reason: string, then: 'exit' | 'reboot' = 'exit', code = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`Shutting down (${reason})`);
  const timeout = setTimeout(() => { log.error('Shutdown timed out, exiting'); process.exit(1); }, SHUTDOWN_TIMEOUT_MS);
  await state.request('asleep', 'shutdown');
  socket.close();
  terminateGpio();
  clearTimeout(timeout);
  if (then === 'reboot') {
    log.info('Rebooting the system');
    await command.run('sudo', ['reboot']);
  }
  process.exit(code);
}

// Installed after initGpio on purpose: the handler installed last receives the signal, pigpio's would just exit.
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => log.error(`Unhandled rejection: ${String(reason)}`));
process.on('uncaughtException', (err) => {
  log.error(`Uncaught exception: ${err.stack ?? String(err)}`);
  void shutdown('uncaught exception', 'exit', 1);
});
