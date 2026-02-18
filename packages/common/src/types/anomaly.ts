export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnomalyType {
  THRESHOLD_VIOLATION = 'threshold_violation',
  RATE_OF_CHANGE = 'rate_of_change',
  STATISTICAL_OUTLIER = 'statistical_outlier',
  MISSING_DATA = 'missing_data',
  ML_DETECTED = 'ml_detected',
}

export enum RuleType {
  ABSOLUTE_THRESHOLD = 'absolute_threshold',
  RATE_OF_CHANGE = 'rate_of_change',
  Z_SCORE = 'z_score',
  BOLLINGER_BAND = 'bollinger_band',
  EWMA = 'ewma',
}

export interface AnomalyEvent {
  anomalyId: string;
  robotId: string;
  assetId: string;
  sensorId: string;
  severity: Severity;
  anomalyType: AnomalyType;
  description: string;
  value: number;
  threshold: number;
  blobRef?: string;
  timestamp: Date;
  acknowledged?: boolean;
  metadata?: Record<string, string>;
}

export interface AnomalyRule {
  ruleId: string;
  assetId?: string;
  sensorType: string;
  ruleType: RuleType;
  minThreshold?: number;
  maxThreshold?: number;
  rateOfChangeLimit?: number;
  windowSize?: number;
  zScoreThreshold?: number;
  severity: Severity;
  enabled: boolean;
}
