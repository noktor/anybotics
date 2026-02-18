import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { SensorReading, AnomalyEvent, AnomalyRule, generateId } from '@anybotics/common';
import { ThresholdDetector } from './detectors/threshold.detector';
import { ZScoreDetector } from './detectors/zscore.detector';

@Injectable()
export class AnomalyDetectionService implements OnModuleInit {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private rules: AnomalyRule[] = [];
  private pool!: Pool;

  constructor(
    private readonly config: ConfigService,
    private readonly thresholdDetector: ThresholdDetector,
    private readonly zScoreDetector: ZScoreDetector,
  ) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.config.get('TIMESCALE_HOST', 'localhost'),
      port: this.config.get<number>('TIMESCALE_PORT', 5432),
      user: this.config.get('TIMESCALE_USER', 'anybotics'),
      password: this.config.get('TIMESCALE_PASSWORD', 'anybotics'),
      database: this.config.get('TIMESCALE_DATABASE', 'anybotics'),
      max: 5,
    });

    await this.loadRules();
    this.logger.log(`Loaded ${this.rules.length} anomaly detection rules`);
  }

  private async loadRules(): Promise<void> {
    const result = await this.pool.query(
      'SELECT * FROM anomaly_rules WHERE enabled = true',
    );

    this.rules = result.rows.map((row) => ({
      ruleId: row.rule_id,
      assetId: row.asset_id,
      sensorType: row.sensor_type,
      ruleType: row.rule_type,
      minThreshold: row.min_threshold,
      maxThreshold: row.max_threshold,
      rateOfChangeLimit: row.rate_of_change_limit,
      windowSize: row.window_size,
      zScoreThreshold: row.z_score_threshold,
      severity: row.severity,
      enabled: row.enabled,
    }));
  }

  async evaluate(reading: SensorReading): Promise<AnomalyEvent | null> {
    const applicableRules = this.rules.filter(
      (rule) =>
        rule.sensorType === reading.sensorType &&
        (!rule.assetId || rule.assetId === reading.assetId),
    );

    for (const rule of applicableRules) {
      let anomaly: AnomalyEvent | null = null;

      switch (rule.ruleType) {
        case 'absolute_threshold':
          anomaly = this.thresholdDetector.evaluate(reading, rule);
          break;
        case 'z_score':
          anomaly = this.zScoreDetector.evaluate(reading, rule);
          break;
      }

      if (anomaly) {
        return {
          ...anomaly,
          anomalyId: generateId(),
          timestamp: reading.timestamp,
        };
      }
    }

    this.zScoreDetector.addSample(reading);
    return null;
  }

  async refreshRules(): Promise<void> {
    await this.loadRules();
    this.logger.log(`Refreshed anomaly rules: ${this.rules.length} active`);
  }
}
