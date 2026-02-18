import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssetsService {
  private tsPool: Pool;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.tsPool = new Pool({
      host: config.get('TIMESCALE_HOST', 'localhost'),
      port: config.get<number>('TIMESCALE_PORT', 5432),
      user: config.get('TIMESCALE_USER', 'anybotics'),
      password: config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 10,
    });
  }

  async findAll(siteId?: string) {
    return this.prisma.asset.findMany({
      where: siteId ? { siteId } : undefined,
      include: { site: true, children: true },
    });
  }

  async findOne(assetId: string) {
    return this.prisma.asset.findUnique({
      where: { assetId },
      include: { site: true, children: true, parent: true, anomalyRules: true },
    });
  }

  async getReadings(assetId: string, params: {
    sensorType?: string;
    from?: string;
    to?: string;
    resolution?: string;
    limit?: number;
  }) {
    const { sensorType, from, to, resolution, limit = 1000 } = params;

    const view = this.resolveView(resolution);
    const timeCol = view === 'sensor_readings' ? 'time' : 'bucket';
    const valueCols = view === 'sensor_readings'
      ? 'value, unit, quality'
      : 'avg_value, min_value, max_value, stddev_value, sample_count';

    let query = `SELECT ${timeCol} AS time, sensor_id, sensor_type, ${valueCols} FROM ${view} WHERE asset_id = $1`;
    const queryParams: unknown[] = [assetId];
    let paramIdx = 2;

    if (sensorType) {
      query += ` AND sensor_type = $${paramIdx++}`;
      queryParams.push(sensorType);
    }
    if (from) {
      query += ` AND ${timeCol} >= $${paramIdx++}`;
      queryParams.push(from);
    }
    if (to) {
      query += ` AND ${timeCol} <= $${paramIdx++}`;
      queryParams.push(to);
    }

    query += ` ORDER BY ${timeCol} DESC LIMIT $${paramIdx}`;
    queryParams.push(limit);

    const result = await this.tsPool.query(query, queryParams);
    return result.rows;
  }

  private resolveView(resolution?: string): string {
    switch (resolution) {
      case '1h': return 'sensor_readings_hourly';
      case '1d': return 'sensor_readings_daily';
      default: return 'sensor_readings';
    }
  }
}
