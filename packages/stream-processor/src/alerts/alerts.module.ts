import { Module, Global } from '@nestjs/common';
import { AlertDispatchService } from './alert-dispatch.service';

@Global()
@Module({
  providers: [AlertDispatchService],
  exports: [AlertDispatchService],
})
export class AlertsModule {}
