import { Module } from '@nestjs/common';
import { AnomalyModule } from '../anomaly/anomaly.module';
import { KafkaConsumerService } from './kafka-consumer.service';

@Module({
  imports: [AnomalyModule],
  providers: [KafkaConsumerService],
})
export class ConsumerModule {}
