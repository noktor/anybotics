import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

const STALE_THRESHOLD_SECONDS = 30;
const HEARTBEAT_CHECK_INTERVAL_MS = 10_000;

@Injectable()
export class RobotsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RobotsService.name);
  private tsPool: Pool;
  private heartbeatTimer!: NodeJS.Timeout;

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

  onModuleInit() {
    this.heartbeatTimer = setInterval(
      () => this.markStaleRobotsOffline(),
      HEARTBEAT_CHECK_INTERVAL_MS,
    );
    this.logger.log('Robot heartbeat checker started');
  }

  onModuleDestroy() {
    clearInterval(this.heartbeatTimer);
  }

  private async markStaleRobotsOffline(): Promise<void> {
    try {
      const result = await this.prisma.robot.updateMany({
        where: {
          status: { notIn: ['offline', 'disabled'] },
          OR: [
            { lastSeenAt: null },
            { lastSeenAt: { lt: new Date(Date.now() - STALE_THRESHOLD_SECONDS * 1000) } },
          ],
        },
        data: { status: 'offline' },
      });
      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} stale robot(s) as offline`);
      }
    } catch {
      // Silently ignore — this is a best-effort background task
    }
  }

  async findAll() {
    return this.prisma.robot.findMany({
      where: { status: { not: 'disabled' } },
      include: { site: true },
    });
  }

  async findOne(robotId: string) {
    return this.prisma.robot.findUnique({
      where: { robotId },
      include: { site: true, missions: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async getTelemetry(robotId: string, params: {
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

    let query = `SELECT ${timeCol} AS time, sensor_id, sensor_type, ${valueCols} FROM ${view} WHERE robot_id = $1`;
    const queryParams: unknown[] = [robotId];
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

  async getLatestPoses() {
    const result = await this.tsPool.query(`
      SELECT DISTINCT ON (rp.robot_id)
        rp.time, rp.robot_id, rp.x, rp.y, rp.z, rp.heading, rp.speed, rp.battery_level,
        rp.site_id, rp.mission_id, rp.waypoint_idx, rp.metadata
      FROM robot_poses rp
      INNER JOIN robots r ON r.robot_id = rp.robot_id AND r.status != 'disabled'
      ORDER BY rp.robot_id, rp.time DESC
    `);
    return result.rows;
  }

  async getPoseTrail(robotId: string, params: { from?: string; to?: string; limit?: number }) {
    const { from, to, limit = 500 } = params;
    let query = 'SELECT time, x, y, z, heading, speed, battery_level, waypoint_idx FROM robot_poses WHERE robot_id = $1';
    const queryParams: unknown[] = [robotId];
    let paramIdx = 2;

    if (from) {
      query += ` AND time >= $${paramIdx++}`;
      queryParams.push(from);
    }
    if (to) {
      query += ` AND time <= $${paramIdx++}`;
      queryParams.push(to);
    }

    query += ` ORDER BY time DESC LIMIT $${paramIdx}`;
    queryParams.push(Number(limit) || 500);

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
