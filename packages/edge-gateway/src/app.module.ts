import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { MqttModule } from './mqtt/mqtt.module';
import { KafkaModule } from './kafka/kafka.module';
import { MinioModule } from './minio/minio.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
    MqttModule,
    KafkaModule,
    MinioModule,
    GatewayModule,
  ],
})
export class AppModule {}
