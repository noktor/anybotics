import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsService {
  private tsPool: Pool;

  constructor(private readonly config: ConfigService) {
    this.tsPool = new Pool({
      host: config.get('TIMESCALE_HOST', 'localhost'),
      port: config.get<number>('TIMESCALE_PORT', 5432),
      user: config.get('TIMESCALE_USER', 'anybotics'),
      password: config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 10,
    });
  }

  async getTrends(params: {
    assetId: string;
    sensorType: string;
    from: string;
    to: string;
    resolution?: string;
  }) {
    const { assetId, sensorType, from, to, resolution = '1h' } = params;

    const view = resolution === '1d' ? 'sensor_readings_daily' : 'sensor_readings_hourly';

    const result = await this.tsPool.query(
      `SELECT bucket AS time, avg_value, min_value, max_value, stddev_value, sample_count
       FROM ${view}
       WHERE asset_id = $1 AND sensor_type = $2 AND bucket >= $3 AND bucket <= $4
       ORDER BY bucket ASC`,
      [assetId, sensorType, from, to],
    );

    return result.rows;
  }

  async getComparison(params: {
    assetId: string;
    sensorType: string;
    period1From: string;
    period1To: string;
    period2From: string;
    period2To: string;
  }) {
    const { assetId, sensorType, period1From, period1To, period2From, period2To } = params;

    const [period1, period2] = await Promise.all([
      this.tsPool.query(
        `SELECT AVG(avg_value) as avg, MIN(min_value) as min, MAX(max_value) as max,
                AVG(stddev_value) as stddev, SUM(sample_count) as total_samples
         FROM sensor_readings_hourly
         WHERE asset_id = $1 AND sensor_type = $2 AND bucket >= $3 AND bucket <= $4`,
        [assetId, sensorType, period1From, period1To],
      ),
      this.tsPool.query(
        `SELECT AVG(avg_value) as avg, MIN(min_value) as min, MAX(max_value) as max,
                AVG(stddev_value) as stddev, SUM(sample_count) as total_samples
         FROM sensor_readings_hourly
         WHERE asset_id = $1 AND sensor_type = $2 AND bucket >= $3 AND bucket <= $4`,
        [assetId, sensorType, period2From, period2To],
      ),
    ]);

    return {
      period1: { from: period1From, to: period1To, ...period1.rows[0] },
      period2: { from: period2From, to: period2To, ...period2.rows[0] },
    };
  }
}
