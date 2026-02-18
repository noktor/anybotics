import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { SensorReading, AnomalyEvent, RobotPose, DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL_MS } from '@anybotics/common';

@Injectable()
export class TimescaleWriterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimescaleWriterService.name);
  private pool!: Pool;
  private readingBuffer: SensorReading[] = [];
  private flushTimer!: NodeJS.Timeout;
  private activeRobotIds = new Set<string>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.config.get('TIMESCALE_HOST', 'localhost'),
      port: this.config.get<number>('TIMESCALE_PORT', 5432),
      user: this.config.get('TIMESCALE_USER', 'anybotics'),
      password: this.config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: this.config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 20,
      idleTimeoutMillis: 30000,
    });

    await this.pool.query('SELECT 1');
    this.logger.log('Connected to TimescaleDB');

    this.flushTimer = setInterval(
      () => this.flushReadings(),
      DEFAULT_FLUSH_INTERVAL_MS,
    );
  }

  async bufferReading(reading: SensorReading): Promise<void> {
    this.readingBuffer.push(reading);
    if (reading.robotId) this.activeRobotIds.add(reading.robotId);
    if (this.readingBuffer.length >= DEFAULT_BATCH_SIZE) {
      await this.flushReadings();
    }
  }

  async flushReadings(): Promise<void> {
    if (this.readingBuffer.length === 0) return;

    const batch = this.readingBuffer.splice(0, this.readingBuffer.length);
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const r of batch) {
      values.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      params.push(
        r.timestamp,
        r.robotId,
        r.assetId,
        r.sensorId,
        r.sensorType,
        r.value,
        r.unit,
        r.metadata ? JSON.stringify(r.metadata) : null,
        r.quality ?? 100,
      );
    }

    const query = `
      INSERT INTO sensor_readings (time, robot_id, asset_id, sensor_id, sensor_type, value, unit, metadata, quality)
      VALUES ${values.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    try {
      await this.pool.query(query, params);
      this.logger.debug(`Flushed ${batch.length} readings to TimescaleDB`);
      await this.flushRobotHeartbeats();
    } catch (err) {
      this.logger.error(`Failed to flush readings: ${(err as Error).message}`);
      this.readingBuffer.unshift(...batch);
    }
  }

  private async flushRobotHeartbeats(): Promise<void> {
    if (this.activeRobotIds.size === 0) return;

    const robotIds = Array.from(this.activeRobotIds);
    this.activeRobotIds.clear();

    try {
      const placeholders = robotIds.map((_, i) => `$${i + 1}`).join(', ');
      await this.pool.query(
        `UPDATE robots SET status = 'online', last_seen_at = NOW(), updated_at = NOW() WHERE robot_id IN (${placeholders})`,
        robotIds,
      );
      this.logger.debug(`Updated heartbeat for ${robotIds.length} robot(s)`);
    } catch (err) {
      this.logger.error(`Failed to update robot heartbeats: ${(err as Error).message}`);
    }
  }

  async writeAnomalyEvent(event: AnomalyEvent): Promise<void> {
    const query = `
      INSERT INTO anomaly_events (time, anomaly_id, robot_id, asset_id, sensor_id, severity, anomaly_type, description, value, threshold, blob_ref, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await this.pool.query(query, [
      event.timestamp,
      event.anomalyId,
      event.robotId,
      event.assetId,
      event.sensorId,
      event.severity,
      event.anomalyType,
      event.description,
      event.value,
      event.threshold,
      event.blobRef || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ]);
  }

  async writePose(pose: RobotPose): Promise<void> {
    const query = `
      INSERT INTO robot_poses (time, robot_id, x, y, z, heading, speed, battery_level, site_id, mission_id, waypoint_idx, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    await this.pool.query(query, [
      pose.timestamp,
      pose.robotId,
      pose.x,
      pose.y,
      pose.z,
      pose.heading,
      pose.speed,
      pose.batteryLevel,
      pose.siteId || null,
      pose.missionId || null,
      pose.waypointIndex ?? null,
      pose.metadata ? JSON.stringify(pose.metadata) : null,
    ]);

    if (pose.robotId) this.activeRobotIds.add(pose.robotId);
  }

  async query(sql: string, params?: unknown[]) {
    return this.pool.query(sql, params);
  }

  async onModuleDestroy() {
    clearInterval(this.flushTimer);
    await this.flushReadings();
    await this.pool.end();
    this.logger.log('TimescaleDB connection closed');
  }
}
