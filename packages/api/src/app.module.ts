import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RobotsModule } from './robots/robots.module';
import { AssetsModule } from './assets/assets.module';
import { AnomaliesModule } from './anomalies/anomalies.module';
import { MissionsModule } from './missions/missions.module';
import { SitesModule } from './sites/sites.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebsocketModule } from './websocket/websocket.module';

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
    PrismaModule,
    AuthModule,
    RobotsModule,
    AssetsModule,
    AnomaliesModule,
    MissionsModule,
    SitesModule,
    AnalyticsModule,
    WebsocketModule,
  ],
})
export class AppModule {}
