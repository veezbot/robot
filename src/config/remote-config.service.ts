import { RobotInitPayload, RobotServerEvent } from '@veezbot/lib';
import { SocketService } from '../socket/socket.service';

export class RemoteConfigService {
  constructor(socketService: SocketService) {
    socketService.on(RobotServerEvent.Init, ({ robotId }: RobotInitPayload) => {
      socketService.robotId = robotId;
    });
  }
}
