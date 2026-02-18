import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CHANNELS } from '@anybotics/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'poses',
})
export class PoseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PoseGateway.name);
  private subscriber!: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe(REDIS_CHANNELS.ROBOT_POSE);

    this.subscriber.on('message', (_channel: string, message: string) => {
      const pose = JSON.parse(message);
      this.server.emit('pose', pose);
    });
  }

  afterInit() {
    this.logger.log('Pose WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Pose client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Pose client disconnected: ${client.id}`);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }
}
