import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { JobsModule } from './jobs/jobs.module';
import { SchedulerModule } from './scheduler/scheduler.module';

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
        },
      }),
    }),
    JobsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
