import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CHANNELS } from '@anybotics/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'alerts',
})
export class AnomalyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AnomalyGateway.name);
  private subscriber!: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });

    this.subscriber.subscribe(REDIS_CHANNELS.ANOMALY_ALERTS);

    this.subscriber.on('message', (_channel: string, message: string) => {
      const anomaly = JSON.parse(message);
      this.server.emit('anomaly', anomaly);
      this.logger.debug(`Broadcast anomaly alert: ${anomaly.anomalyId}`);
    });
  }

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { assetId?: string; siteId?: string },
  ) {
    if (data.assetId) client.join(`asset:${data.assetId}`);
    if (data.siteId) client.join(`site:${data.siteId}`);
    return { event: 'subscribed', data };
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }
}
