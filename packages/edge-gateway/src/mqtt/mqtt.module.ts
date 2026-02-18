import { Module } from '@nestjs/common';
import { MqttSubscriberService } from './mqtt-subscriber.service';

@Module({
  providers: [MqttSubscriberService],
  exports: [MqttSubscriberService],
})
export class MqttModule {}
