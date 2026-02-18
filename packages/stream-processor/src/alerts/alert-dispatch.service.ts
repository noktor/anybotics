import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AnomalyEvent, RobotPose, REDIS_CHANNELS, REDIS_KEYS } from '@anybotics/common';

@Injectable()
export class AlertDispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertDispatchService.name);
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 3,
    });

    this.logger.log('Alert dispatch service connected to Redis');
  }

  async dispatchAnomaly(event: AnomalyEvent): Promise<void> {
    const payload = JSON.stringify(event);

    await this.redis.publish(REDIS_CHANNELS.ANOMALY_ALERTS, payload);
    this.logger.log(
      `Dispatched ${event.severity} anomaly alert for asset ${event.assetId}: ${event.description}`,
    );
  }

  async dispatchPose(pose: RobotPose): Promise<void> {
    const payload = JSON.stringify(pose);
    await this.redis.set(REDIS_KEYS.ROBOT_LATEST_POSE(pose.robotId), payload, 'EX', 60);
    await this.redis.publish(REDIS_CHANNELS.ROBOT_POSE, payload);
  }

  async onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
