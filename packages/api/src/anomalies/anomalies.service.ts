import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnomaliesService {
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

  async findAll(params: {
    assetId?: string;
    severity?: string;
    from?: string;
    to?: string;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { assetId, severity, from, to, acknowledged } = params;
    const limit = Number(params.limit) || 50;
    const offset = Number(params.offset) || 0;

    let query = `
      SELECT ae.*, r.name AS robot_name, a.name AS asset_name
      FROM anomaly_events ae
      LEFT JOIN robots r ON r.robot_id = ae.robot_id
      LEFT JOIN assets a ON a.asset_id = ae.asset_id
      WHERE 1=1`;
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    if (assetId) {
      query += ` AND ae.asset_id = $${paramIdx++}`;
      queryParams.push(assetId);
    }
    if (severity) {
      query += ` AND ae.severity = $${paramIdx++}`;
      queryParams.push(severity);
    }
    if (from) {
      query += ` AND ae.time >= $${paramIdx++}`;
      queryParams.push(from);
    }
    if (to) {
      query += ` AND ae.time <= $${paramIdx++}`;
      queryParams.push(to);
    }
    if (acknowledged !== undefined) {
      query += ` AND ae.acknowledged = $${paramIdx++}`;
      queryParams.push(acknowledged);
    }

    query += ` ORDER BY ae.time DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    queryParams.push(limit, offset);

    const result = await this.tsPool.query(query, queryParams);
    return result.rows;
  }

  async findOne(anomalyId: string) {
    const result = await this.tsPool.query(
      'SELECT * FROM anomaly_events WHERE anomaly_id = $1',
      [anomalyId],
    );
    return result.rows[0] || null;
  }

  async acknowledge(anomalyId: string) {
    const result = await this.tsPool.query(
      'UPDATE anomaly_events SET acknowledged = true WHERE anomaly_id = $1 RETURNING *',
      [anomalyId],
    );
    return result.rows[0] || null;
  }
}
