export enum MissionStatus {
  SCHEDULED = 'scheduled',
  DISPATCHED = 'dispatched',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum CommandType {
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  ABORT = 'abort',
}

export interface InspectionPoint {
  pointId: string;
  assetId: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  sensorTypes: string[];
}

export interface Mission {
  missionId: string;
  robotId: string;
  siteId: string;
  name: string;
  description?: string;
  status: MissionStatus;
  cronExpression?: string;
  inspectionPoints: InspectionPoint[];
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, string>;
}

export interface MissionCommand {
  missionId: string;
  robotId: string;
  commandType: CommandType;
  inspectionPoints: InspectionPoint[];
  timestamp: Date;
}

export interface MissionStatusUpdate {
  missionId: string;
  robotId: string;
  status: MissionStatus;
  currentInspectionPointId?: string;
  progressPercent: number;
  message?: string;
  timestamp: Date;
}
