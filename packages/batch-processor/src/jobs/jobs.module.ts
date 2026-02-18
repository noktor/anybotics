import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DownsamplingProcessor } from './downsampling.processor';
import { RetentionProcessor } from './retention.processor';
import { BlobCleanupProcessor } from './blob-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'downsampling' },
      { name: 'retention' },
      { name: 'blob-cleanup' },
    ),
  ],
  providers: [DownsamplingProcessor, RetentionProcessor, BlobCleanupProcessor],
  exports: [BullModule],
})
export class JobsModule {}
