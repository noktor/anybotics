import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MqttSubscriberService, MqttMessage } from '../mqtt/mqtt-subscriber.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { MinioUploadService } from '../minio/minio-upload.service';
import { KAFKA_TOPICS, MINIO_PATHS, parseMqttTopic, generateId } from '@anybotics/common';

@Injectable()
export class GatewayService implements OnModuleInit {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly mqtt: MqttSubscriberService,
    private readonly kafka: KafkaProducerService,
    private readonly minio: MinioUploadService,
  ) {}

  onModuleInit() {
    this.mqtt.on('message', (message: MqttMessage) => {
      this.routeMessage(message).catch((err) => {
        this.logger.error(`Failed to route message from ${message.topic}: ${err.message}`);
      });
    });
    this.logger.log('Gateway service initialized — routing MQTT messages to Kafka/MinIO');
  }

  private async routeMessage(message: MqttMessage): Promise<void> {
    const { topic, payload, timestamp } = message;
    const { robotId, sensorType } = parseMqttTopic(topic);

    if (!robotId) {
      this.logger.warn(`Could not parse robot ID from topic: ${topic}`);
      return;
    }

    if (topic.endsWith('/blob')) {
      await this.handleBlobMessage(robotId, sensorType, payload, timestamp);
    } else if (topic.endsWith('/data')) {
      await this.handleScalarMessage(robotId, payload);
    } else if (topic.endsWith('/pose')) {
      await this.handlePoseMessage(robotId, payload);
    } else if (topic.includes('/status/mission')) {
      await this.handleMissionStatus(robotId, payload);
    }
  }

  private async handleScalarMessage(robotId: string, payload: Buffer): Promise<void> {
    await this.kafka.produce(KAFKA_TOPICS.SENSOR_SCALAR, robotId, payload);
  }

  private async handleBlobMessage(
    robotId: string,
    sensorType: string | undefined,
    payload: Buffer,
    timestamp: Date,
  ): Promise<void> {
    const folder = this.getBlobFolder(sensorType);
    const filename = `${robotId}/${timestamp.toISOString()}-${generateId()}.bin`;
    const path = `${folder}/${filename}`;

    const blobUri = await this.minio.uploadBlob(path, payload, 'application/octet-stream');

    const blobRef = JSON.stringify({
      robotId,
      sensorType,
      blobUri,
      sizeBytes: payload.length,
      timestamp: timestamp.toISOString(),
    });

    await this.kafka.produce(KAFKA_TOPICS.SENSOR_BLOB_REFS, robotId, blobRef);
  }

  private async handlePoseMessage(robotId: string, payload: Buffer): Promise<void> {
    await this.kafka.produce(KAFKA_TOPICS.ROBOT_POSES, robotId, payload);
  }

  private async handleMissionStatus(robotId: string, payload: Buffer): Promise<void> {
    await this.kafka.produce(KAFKA_TOPICS.SENSOR_EVENTS, robotId, payload);
  }

  private getBlobFolder(sensorType?: string): string {
    switch (sensorType) {
      case 'thermal':
        return MINIO_PATHS.THERMAL_IMAGES;
      case 'rgb':
        return MINIO_PATHS.RGB_IMAGES;
      case 'lidar':
        return MINIO_PATHS.POINT_CLOUDS;
      case 'audio':
        return MINIO_PATHS.AUDIO_CLIPS;
      default:
        return 'other';
    }
  }
}
