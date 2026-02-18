import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('downsampling') private readonly downsamplingQueue: Queue,
    @InjectQueue('retention') private readonly retentionQueue: Queue,
    @InjectQueue('blob-cleanup') private readonly blobCleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.registerRepeatingJobs();
  }

  private async registerRepeatingJobs() {
    await this.downsamplingQueue.upsertJobScheduler(
      'downsampling-hourly',
      { pattern: '0 * * * *' },
      { name: 'downsampling', data: {} },
    );
    this.logger.log('Registered downsampling job (every hour)');

    await this.retentionQueue.upsertJobScheduler(
      'retention-daily',
      { pattern: '0 2 * * *' },
      { name: 'retention', data: {} },
    );
    this.logger.log('Registered retention cleanup job (daily at 02:00)');

    await this.blobCleanupQueue.upsertJobScheduler(
      'blob-cleanup-daily',
      { pattern: '0 3 * * *' },
      { name: 'blob-cleanup', data: {} },
    );
    this.logger.log('Registered blob cleanup job (daily at 03:00)');
  }
}
