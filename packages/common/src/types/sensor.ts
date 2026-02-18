export enum SensorType {
  TEMPERATURE = 'temperature',
  PRESSURE = 'pressure',
  VIBRATION = 'vibration',
  GAS_CONCENTRATION = 'gas_concentration',
  HUMIDITY = 'humidity',
  ACOUSTIC = 'acoustic',
  ELECTRICAL = 'electrical',
}

export enum BlobType {
  THERMAL_IMAGE = 'thermal_image',
  RGB_IMAGE = 'rgb_image',
  POINT_CLOUD = 'point_cloud',
  AUDIO_CLIP = 'audio_clip',
}

export interface SensorReading {
  robotId: string;
  assetId: string;
  sensorId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, string>;
  quality?: number;
}

export interface BlobReference {
  robotId: string;
  assetId: string;
  sensorId: string;
  blobType: BlobType;
  blobUri: string;
  sizeBytes: number;
  contentType: string;
  timestamp: Date;
  missionId?: string;
  metadata?: Record<string, string>;
}

export interface SensorBatch {
  readings: SensorReading[];
  robotId: string;
  missionId?: string;
}
