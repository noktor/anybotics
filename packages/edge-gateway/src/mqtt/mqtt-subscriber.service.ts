import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as mqtt from 'mqtt';
import { MQTT_TOPICS } from '@anybotics/common';

export interface MqttMessage {
  topic: string;
  payload: Buffer;
  timestamp: Date;
}

@Injectable()
export class MqttSubscriberService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttSubscriberService.name);
  private client!: mqtt.MqttClient;

  constructor(private readonly config: ConfigService) {
    super();
  }

  async onModuleInit() {
    const brokerUrl = this.config.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883');
    const clientId = this.config.get<string>(
      'MQTT_CLIENT_ID',
      `edge-gateway-${Date.now()}`,
    );

    this.logger.log(`Connecting to MQTT broker at ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      protocolVersion: 5,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      const message: MqttMessage = { topic, payload, timestamp: new Date() };
      this.emit('message', message);
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });
  }

  private subscribeToTopics() {
    const topics = [MQTT_TOPICS.SENSOR_DATA, MQTT_TOPICS.SENSOR_BLOB, MQTT_TOPICS.ROBOT_POSE, MQTT_TOPICS.MISSION_STATUS];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end(true);
      this.logger.log('Disconnected from MQTT broker');
    }
  }
}
