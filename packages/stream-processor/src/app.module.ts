import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ConsumerModule } from './consumer/consumer.module';
import { StorageModule } from './storage/storage.module';
import { AnomalyModule } from './anomaly/anomaly.module';
import { AlertsModule } from './alerts/alerts.module';

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
    StorageModule,
    AnomalyModule,
    AlertsModule,
    ConsumerModule,
  ],
})
export class AppModule {}
