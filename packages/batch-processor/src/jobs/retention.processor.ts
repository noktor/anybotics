import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { DEFAULT_RETENTION_DAYS } from '@anybotics/common';

@Processor('retention')
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    super();
    this.pool = new Pool({
      host: config.get('TIMESCALE_HOST', 'localhost'),
      port: config.get<number>('TIMESCALE_PORT', 5432),
      user: config.get('TIMESCALE_USER', 'anybotics'),
      password: config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 3,
    });
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Running retention cleanup job: ${job.id}`);
    const retentionDays = this.config.get<number>('RETENTION_DAYS', DEFAULT_RETENTION_DAYS);

    try {
      const result = await this.pool.query(
        `SELECT drop_chunks('sensor_readings', INTERVAL '${retentionDays} days')`,
      );
      this.logger.log(`Dropped ${result.rowCount} expired chunks (retention: ${retentionDays} days)`);
    } catch (err) {
      this.logger.error(`Retention cleanup failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
