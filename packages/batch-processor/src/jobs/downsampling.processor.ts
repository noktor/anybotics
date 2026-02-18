import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Pool } from 'pg';

@Processor('downsampling')
export class DownsamplingProcessor extends WorkerHost {
  private readonly logger = new Logger(DownsamplingProcessor.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    super();
    this.pool = new Pool({
      host: config.get('TIMESCALE_HOST', 'localhost'),
      port: config.get<number>('TIMESCALE_PORT', 5432),
      user: config.get('TIMESCALE_USER', 'anybotics'),
      password: config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 5,
    });
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Running downsampling job: ${job.id}`);
    const start = Date.now();

    try {
      await this.pool.query(
        "CALL refresh_continuous_aggregate('sensor_readings_hourly', NULL, NULL)",
      );
      this.logger.log('Refreshed hourly continuous aggregate');

      await this.pool.query(
        "CALL refresh_continuous_aggregate('sensor_readings_daily', NULL, NULL)",
      );
      this.logger.log('Refreshed daily continuous aggregate');

      this.logger.log(`Downsampling job completed in ${Date.now() - start}ms`);
    } catch (err) {
      this.logger.error(`Downsampling job failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
