import { RobotChatEvent, ChatMessagePayloadSchema, type ChatMessagePayload } from '@veezbot/robot-lib';
import { SocketService } from '../socket/socket.service';
import { CommandService } from '../command/command.service';
import { LogService } from '../log/log.service';

/** A flood would otherwise keep the robot talking minutes behind the chat: the oldest waiting messages are dropped. */
const MAX_QUEUE = 5;
const MAX_TEXT  = 200;

export class ChatService {
  private readonly queue: ChatMessagePayload[] = [];
  private speaking = false;

  constructor(
    private readonly socket: SocketService,
    private readonly command: CommandService,
    private readonly log: LogService,
  ) {
    socket.handle(RobotChatEvent.Message, ChatMessagePayloadSchema, (payload) => this.enqueue(payload));
  }

  private enqueue(payload: ChatMessagePayload): void {
    this.queue.push(payload);
    if (this.queue.length > MAX_QUEUE) {
      const dropped = this.queue.splice(0, this.queue.length - MAX_QUEUE);
      this.log.warn(`Queue full, dropped ${dropped.length} message(s)`);
    }
    if (!this.speaking) this.speakNext();
  }

  private speakNext(): void {
    const msg = this.queue.shift();
    if (!msg) return;

    this.speaking = true;
    const text = `${msg.username}: ${msg.text}`.slice(0, MAX_TEXT);
    this.log.info(`TTS: "${text}"`);
    this.socket.emit(RobotChatEvent.Speaking, { state: 'start' });

    // Text through stdin, never as an argument: a message starting with '-' would be read as an espeak option.
    const proc = this.command.spawn('espeak-ng', ['-s', '140', '--stdin'], { stdio: ['pipe', 'ignore', 'ignore'] });
    proc.stdin?.on('error', () => {});
    proc.stdin?.end(text);

    let ended = false;
    const done = () => {
      if (ended) return;
      ended = true;
      this.socket.emit(RobotChatEvent.Speaking, { state: 'end' });
      this.speaking = false;
      this.speakNext();
    };
    proc.on('error', (err) => { this.log.warn(`TTS unavailable: ${err.message}`); done(); });
    proc.on('close', done);
  }
}
