import { spawn } from 'child_process';
import { RobotChatEvent, ChatMessagePayload } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';
import { LogService } from '../log/log.service';

export class ChatService {
  private readonly queue: ChatMessagePayload[] = [];
  private speaking = false;

  constructor(private readonly socket: SocketService, private readonly log: LogService) {
    socket.on(RobotChatEvent.Message, (payload: ChatMessagePayload) => {
      this.enqueue(payload);
    });
  }

  private enqueue(payload: ChatMessagePayload): void {
    this.queue.push(payload);
    if (!this.speaking) this.processNext();
  }

  private processNext(): void {
    if (this.queue.length === 0) return;
    const msg = this.queue.shift()!;
    this.speak(msg);
  }

  private speak(msg: ChatMessagePayload): void {
    this.speaking = true;
    this.log.info(`[Chat] TTS: "${msg.username}: ${msg.text}"`);
    this.socket.emit(RobotChatEvent.Speaking, { state: 'start' });

    const text = `${msg.username}: ${msg.text}`;
    const proc = spawn('espeak-ng', ['-s', '140', text], { stdio: 'ignore' });

    const done = () => {
      this.socket.emit(RobotChatEvent.Speaking, { state: 'end' });
      this.speaking = false;
      this.processNext();
    };

    proc.on('error', (err) => {
      this.log.info(`[Chat] TTS unavailable: ${err.message}`);
      done();
    });

    proc.on('close', done);
  }
}
