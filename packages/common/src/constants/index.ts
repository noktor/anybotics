export const KAFKA_TOPICS = {
  SENSOR_SCALAR: 'robot-telemetry.scalar',
  SENSOR_BLOB_REFS: 'robot-telemetry.blob-refs',
  SENSOR_EVENTS: 'robot-telemetry.events',
  ROBOT_POSES: 'robot-poses',
  ANOMALIES: 'robot-anomalies',
  COMMANDS: 'robot-commands',
  DEAD_LETTER: 'robot-telemetry.dead-letter',
} as const;

export const MQTT_TOPICS = {
  SENSOR_DATA: 'robots/+/sensors/+/data',
  SENSOR_BLOB: 'robots/+/sensors/+/blob',
  ROBOT_POSE: 'robots/+/pose',
  MISSION_STATUS: 'robots/+/status/mission',
  MISSION_COMMAND: 'robots/{robotId}/commands/mission',
  ROBOT_HEALTH: 'robots/+/health',
} as const;

export const REDIS_CHANNELS = {
  ANOMALY_ALERTS: 'anomaly-alerts',
  ROBOT_POSE: 'robot-pose',
  MISSION_UPDATES: 'mission-updates',
  ROBOT_STATUS: 'robot-status',
} as const;

export const REDIS_KEYS = {
  ROBOT_LATEST_POSE: (robotId: string) => `robot:${robotId}:pose`,
} as const;

export const MINIO_PATHS = {
  THERMAL_IMAGES: 'thermal-images',
  RGB_IMAGES: 'rgb-images',
  POINT_CLOUDS: 'point-clouds',
  AUDIO_CLIPS: 'audio-clips',
  REPORTS: 'reports',
} as const;

export const CONSUMER_GROUPS = {
  STREAM_PROCESSOR: 'stream-processor-group',
  BATCH_PROCESSOR: 'batch-processor-group',
} as const;

export const DEFAULT_BATCH_SIZE = 1000;
export const DEFAULT_FLUSH_INTERVAL_MS = 500;
export const DEFAULT_RETENTION_DAYS = 90;
export const DEFAULT_COMPRESSION_AFTER_DAYS = 7;
