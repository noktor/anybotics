export interface Robot {
  robotId: string;
  name: string;
  model: string;
  firmwareVersion: string;
  siteId: string;
  status: RobotStatus;
  lastSeenAt?: Date;
  metadata?: Record<string, string>;
}

export enum RobotStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CHARGING = 'charging',
  ON_MISSION = 'on_mission',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export interface RobotPose {
  robotId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  batteryLevel: number;
  timestamp: Date | string;
  siteId?: string;
  missionId?: string;
  waypointIndex?: number;
  metadata?: Record<string, string>;
}
