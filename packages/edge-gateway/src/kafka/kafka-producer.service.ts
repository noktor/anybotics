import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, CompressionTypes } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const brokers = this.config
      .get<string>('KAFKA_BROKERS', 'localhost:19092')
      .split(',');
    const clientId = this.config.get<string>('KAFKA_CLIENT_ID', 'edge-gateway');

    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });

    await this.producer.connect();
    this.logger.log(`Kafka producer connected to ${brokers.join(', ')}`);
  }

  async produce(topic: string, key: string, value: string | Buffer): Promise<void> {
    await this.producer.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key,
          value: typeof value === 'string' ? value : value,
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  async produceBatch(
    topic: string,
    messages: Array<{ key: string; value: string | Buffer }>,
  ): Promise<void> {
    await this.producer.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: messages.map((m) => ({
        ...m,
        timestamp: Date.now().toString(),
      })),
    });
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }
}
