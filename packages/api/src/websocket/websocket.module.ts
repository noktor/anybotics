import { Module } from '@nestjs/common';
import { AnomalyGateway } from './anomaly.gateway';
import { PoseGateway } from './pose.gateway';

@Module({
  providers: [AnomalyGateway, PoseGateway],
})
export class WebsocketModule {}
