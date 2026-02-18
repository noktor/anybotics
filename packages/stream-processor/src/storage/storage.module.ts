import { Module, Global } from '@nestjs/common';
import { TimescaleWriterService } from './timescale-writer.service';

@Global()
@Module({
  providers: [TimescaleWriterService],
  exports: [TimescaleWriterService],
})
export class StorageModule {}
