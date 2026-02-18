import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
