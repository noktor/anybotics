import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS, CONSUMER_GROUPS, SensorReading, RobotPose } from '@anybotics/common';
import { TimescaleWriterService } from '../storage/timescale-writer.service';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service';
import { AlertDispatchService } from '../alerts/alert-dispatch.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka!: Kafka;
  private consumer!: Consumer;

  constructor(
    private readonly config: ConfigService,
    private readonly timescaleWriter: TimescaleWriterService,
    private readonly anomalyDetection: AnomalyDetectionService,
    private readonly alertDispatch: AlertDispatchService,
  ) {}

  async onModuleInit() {
    const brokers = this.config
      .get<string>('KAFKA_BROKERS', 'localhost:19092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'stream-processor',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: CONSUMER_GROUPS.STREAM_PROCESSOR,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await this.consumer.connect();
    this.logger.log('Kafka consumer connected');

    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.SENSOR_SCALAR, KAFKA_TOPICS.SENSOR_BLOB_REFS, KAFKA_TOPICS.ROBOT_POSES],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async (payload) => {
        await this.processMessage(payload);
      },
    });

    this.logger.log('Kafka consumer running');
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;

    try {
      if (!message.value) return;

      const data = JSON.parse(message.value.toString());

      switch (topic) {
        case KAFKA_TOPICS.SENSOR_SCALAR:
          await this.processScalarReading(data);
          break;
        case KAFKA_TOPICS.SENSOR_BLOB_REFS:
          await this.processBlobRef(data);
          break;
        case KAFKA_TOPICS.ROBOT_POSES:
          await this.processPose(data);
          break;
      }
    } catch (err) {
      this.logger.error(
        `Failed to process message from ${topic}: ${(err as Error).message}`,
      );
    }
  }

  private async processScalarReading(data: Record<string, unknown>): Promise<void> {
    const reading: SensorReading = {
      robotId: data.robotId as string,
      assetId: data.assetId as string,
      sensorId: data.sensorId as string,
      sensorType: data.sensorType as SensorReading['sensorType'],
      value: data.value as number,
      unit: data.unit as string,
      timestamp: new Date(data.timestamp as string),
      metadata: data.metadata as Record<string, string> | undefined,
      quality: (data.quality as number) ?? 100,
    };

    await this.timescaleWriter.bufferReading(reading);

    const anomaly = await this.anomalyDetection.evaluate(reading);
    if (anomaly) {
      await this.timescaleWriter.writeAnomalyEvent(anomaly);
      await this.alertDispatch.dispatchAnomaly(anomaly);
    }
  }

  private async processPose(data: Record<string, unknown>): Promise<void> {
    const pose: RobotPose = {
      robotId: data.robotId as string,
      x: data.x as number,
      y: data.y as number,
      z: (data.z as number) ?? 0,
      heading: (data.heading as number) ?? 0,
      speed: (data.speed as number) ?? 0,
      batteryLevel: (data.batteryLevel as number) ?? 100,
      timestamp: new Date(data.timestamp as string),
      siteId: data.siteId as string | undefined,
      missionId: data.missionId as string | undefined,
      waypointIndex: data.waypointIndex as number | undefined,
    };

    await this.timescaleWriter.writePose(pose);
    await this.alertDispatch.dispatchPose(pose);
  }

  private async processBlobRef(data: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Indexed blob ref: ${data.blobUri} for robot ${data.robotId}`);
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.logger.log('Kafka consumer disconnected');
    }
  }
}
