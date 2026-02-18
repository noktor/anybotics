import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { MqttModule } from '../mqtt/mqtt.module';
import { KafkaModule } from '../kafka/kafka.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MqttModule, KafkaModule, MinioModule],
  providers: [GatewayService],
})
export class GatewayModule {}
