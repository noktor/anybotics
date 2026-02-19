/**
 * ANYmal Robot Simulator
 *
 * Connects to the MQTT broker and publishes realistic sensor data
 * and pose tracking for ANYmal robots on inspection missions.
 *
 * Lifecycle: traveling → inspecting → traveling → ... → battery low → returning to dock → charging → full → traveling ...
 * Connectivity: robots lose signal in dead zones (Pipe Gallery, Storage Area) and experience sporadic disconnections.
 * Buffering: when offline, the robot continues collecting data into an onboard buffer (up to MAX_BUFFER_SIZE messages).
 *            On reconnection, buffered messages are flushed in batches to avoid flooding the broker.
 *
 * Usage:
 *   npx ts-node scripts/simulate-robot.ts
 *
 * Environment variables:
 *   MQTT_BROKER_URL  (default: mqtt://localhost:1883)
 *   ROBOT_COUNT      (default: 5)
 *   INTERVAL_MS      (default: 1000)
 *   ANOMALY_RATE     (default: 0.003)
 */

import 'dotenv/config';
import * as mqtt from 'mqtt';

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const ROBOT_COUNT = parseInt(process.env.ROBOT_COUNT || '5', 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '1000', 10);
const ANOMALY_RATE = parseFloat(process.env.ANOMALY_RATE || '0.0004');

const BATTERY_LOW_THRESHOLD = 30;
const BATTERY_FULL_THRESHOLD = 98;
const BATTERY_DRAIN_TRAVELING = 0.06;
const BATTERY_DRAIN_INSPECTING = 0.03;
const BATTERY_CHARGE_RATE = 0.4;

const DOCK_WAYPOINT_IDX = 0;

// ── Connectivity simulation ──────────────────────────────────
const SPORADIC_OFFLINE_CHANCE = 0.003;      // 0.3% chance per tick of random disconnection
const SPORADIC_OFFLINE_MIN_TICKS = 10;      // min 10s offline
const SPORADIC_OFFLINE_MAX_TICKS = 30;      // max 30s offline

// ── Onboard telemetry buffer ─────────────────────────────────
const MAX_BUFFER_SIZE = 5000;               // max messages stored onboard (finite storage)
const FLUSH_BATCH_SIZE = 50;                // messages flushed per tick to avoid flooding the broker

const SITES = [
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
];

const ASSETS = [
  { assetId: 'b0000000-0000-0000-0000-000000000002', name: 'Turbine T-101' },
  { assetId: 'b0000000-0000-0000-0000-000000000003', name: 'Bearing B-101' },
  { assetId: 'b0000000-0000-0000-0000-000000000004', name: 'Pump P-201' },
];

interface SensorConfig {
  sensorId: string;
  sensorType: string;
  unit: string;
  baseline: number;
  noise: number;
  drift: number;
  anomalySpike: number;
}

const SENSORS: SensorConfig[] = [
  { sensorId: 'temp-bearing', sensorType: 'temperature', unit: '°C', baseline: 55, noise: 2, drift: 0.01, anomalySpike: 35 },
  { sensorId: 'vib-motor', sensorType: 'vibration', unit: 'mm/s', baseline: 4.5, noise: 0.5, drift: 0.005, anomalySpike: 10 },
  { sensorId: 'pressure-pipe', sensorType: 'pressure', unit: 'bar', baseline: 95, noise: 3, drift: -0.02, anomalySpike: 60 },
  { sensorId: 'gas-h2s', sensorType: 'gas_concentration', unit: 'ppm', baseline: 2, noise: 0.5, drift: 0.001, anomalySpike: 15 },
  { sensorId: 'humidity', sensorType: 'humidity', unit: '%RH', baseline: 45, noise: 5, drift: 0, anomalySpike: 30 },
];

interface Waypoint {
  x: number;
  y: number;
  label: string;
  inspectionPoint: boolean;
  dwellTicks: number;
  deadZone: boolean;       // true → robot always loses connectivity here
  weakSignal: boolean;     // true → 40% chance of sporadic drop each tick while here
}

const WAYPOINTS: Waypoint[] = [
  { x: 0,  y: 0,  label: 'Dock',               inspectionPoint: false, dwellTicks: 5,  deadZone: false, weakSignal: false },
  { x: 10, y: 0,  label: 'Corridor A',          inspectionPoint: false, dwellTicks: 0,  deadZone: false, weakSignal: false },
  { x: 20, y: 5,  label: 'Turbine Hall Entry',  inspectionPoint: false, dwellTicks: 0,  deadZone: false, weakSignal: false },
  { x: 30, y: 10, label: 'Turbine T-101',       inspectionPoint: true,  dwellTicks: 20, deadZone: false, weakSignal: false },
  { x: 35, y: 20, label: 'Bearing B-101',       inspectionPoint: true,  dwellTicks: 15, deadZone: false, weakSignal: false },
  { x: 40, y: 30, label: 'Cooling Section',     inspectionPoint: true,  dwellTicks: 12, deadZone: false, weakSignal: false },
  { x: 35, y: 40, label: 'Pump P-201',          inspectionPoint: true,  dwellTicks: 18, deadZone: false, weakSignal: false },
  { x: 25, y: 45, label: 'Pipe Gallery',        inspectionPoint: false, dwellTicks: 0,  deadZone: true,  weakSignal: false },  // underground pipes, no signal
  { x: 15, y: 40, label: 'Gas Detection Zone',  inspectionPoint: true,  dwellTicks: 10, deadZone: false, weakSignal: true },   // heavy EMI from gas sensors
  { x: 10, y: 30, label: 'Storage Area',        inspectionPoint: false, dwellTicks: 0,  deadZone: true,  weakSignal: false },  // thick concrete walls
  { x: 5,  y: 20, label: 'Corridor B',          inspectionPoint: false, dwellTicks: 0,  deadZone: false, weakSignal: false },
  { x: 0,  y: 10, label: 'Return Path',         inspectionPoint: false, dwellTicks: 0,  deadZone: false, weakSignal: false },
];

const ROBOT_SPEEDS = [0.04, 0.035, 0.045, 0.038, 0.042];
const ROBOT_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];

function makeRobotId(index: number): string {
  const num = (index + 1).toString(16).padStart(12, '0');
  return `c0000000-0000-0000-0000-${num}`;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

type RobotState = 'traveling' | 'inspecting' | 'returning_to_dock' | 'charging';
type OfflineReason = 'dead_zone' | 'weak_signal' | 'sporadic' | null;

interface BufferedMessage {
  topic: string;
  payload: string;
  qos: 0 | 1;
}

class RobotSimulator {
  private client: mqtt.MqttClient;
  private robotIndex: number;
  private robotId: string;
  private robotName: string;
  private tag: string; // e.g. "[Alpha]" for log lines
  private siteId: string;
  private tickCount = 0;
  private travelSpeed: number;
  private battery: number;
  private rand: () => number;

  private currentWaypointIdx: number;
  private segmentProgress = 0;
  private state: RobotState = 'traveling';
  private dwellRemaining = 0;
  private resumeWaypointIdx = -1;

  // Connectivity simulation
  private connected = true;
  private offlineTicksRemaining = 0;
  private offlineReason: OfflineReason = null;
  private wasConnected = true;

  // Onboard telemetry buffer — stores messages while offline, flushes on reconnect
  private buffer: BufferedMessage[] = [];
  private totalDropped = 0;

  constructor(brokerUrl: string, robotIndex: number) {
    this.robotIndex = robotIndex;
    this.robotId = makeRobotId(robotIndex);
    this.robotName = ROBOT_NAMES[robotIndex] ?? `Robot-${robotIndex}`;
    this.tag = `[${this.robotName}]`;
    this.siteId = SITES[robotIndex % SITES.length];
    this.travelSpeed = ROBOT_SPEEDS[robotIndex % ROBOT_SPEEDS.length];
    this.rand = seededRandom(robotIndex * 7919 + 42);

    // Stagger starting batteries so they don't all dock at the same time
    this.battery = 55 + robotIndex * 8;

    this.currentWaypointIdx = (robotIndex * Math.floor(WAYPOINTS.length / ROBOT_COUNT)) % WAYPOINTS.length;
    this.segmentProgress = 0;
    this.state = 'traveling';

    this.client = mqtt.connect(brokerUrl, {
      clientId: `simulator-robot-${robotIndex}-${Date.now()}`,
      protocolVersion: 5,
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.client.on('connect', () => {
        console.log(`${this.tag} Connected (${this.robotId}) starting at ${WAYPOINTS[this.currentWaypointIdx].label} — battery ${this.battery.toFixed(0)}%`);
        setInterval(() => this.tick(), INTERVAL_MS);
        resolve();
      });

      this.client.on('error', (err) => {
        console.error(`${this.tag} Error: ${err.message}`);
      });
    });
  }

  private tick() {
    this.tickCount++;
    this.updatePosition();
    this.updateConnectivity();

    // Robot always collects data autonomously, regardless of connectivity
    this.collectReadings();
    this.collectPose();

    // Flush buffered messages when connected (both live + backlog)
    if (this.connected) {
      this.flushBuffer();
    }
  }

  /** Enqueue a message — published immediately if online, buffered if offline */
  private enqueue(topic: string, payload: string, qos: 0 | 1) {
    this.buffer.push({ topic, payload, qos });
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
      this.totalDropped++;
    }
  }

  /** Flush up to FLUSH_BATCH_SIZE messages per tick to avoid flooding the broker */
  private flushBuffer() {
    if (this.buffer.length === 0) return;

    const wasBacklogged = this.buffer.length > FLUSH_BATCH_SIZE;
    const batch = this.buffer.splice(0, FLUSH_BATCH_SIZE);

    for (const msg of batch) {
      this.client.publish(msg.topic, msg.payload, { qos: msg.qos });
    }

    if (wasBacklogged) {
      console.log(`${this.tag} 📤 Flushing buffer: sent ${batch.length}, ${this.buffer.length} remaining`);
    }
  }

  private updateConnectivity() {
    this.wasConnected = this.connected;
    const wp = WAYPOINTS[this.currentWaypointIdx];
    const nextIdx = (this.currentWaypointIdx + 1) % WAYPOINTS.length;
    const nextWp = WAYPOINTS[nextIdx];

    // Dead zone: current waypoint is a dead zone, or approaching one (progress > 0.7)
    const inDeadZone =
      wp.deadZone ||
      (nextWp.deadZone && this.state === 'traveling' && this.segmentProgress > 0.7);

    if (inDeadZone) {
      if (this.connected) {
        this.connected = false;
        this.offlineReason = 'dead_zone';
        this.offlineTicksRemaining = 0;
        console.log(`${this.tag} 📡 Signal LOST — dead zone: ${wp.deadZone ? wp.label : nextWp.label} (${wp.deadZone ? 'thick walls / underground' : 'approaching dead zone'})`);
      }
      return;
    }

    // Leaving dead zone — reconnect (unless in sporadic disconnect)
    if (this.offlineReason === 'dead_zone') {
      this.connected = true;
      this.offlineReason = null;
      console.log(`${this.tag} 📡 Signal RESTORED — left dead zone (${this.buffer.length} buffered messages to sync)`);
      return;
    }

    // Sporadic disconnect countdown
    if (this.offlineTicksRemaining > 0) {
      this.offlineTicksRemaining--;
      if (this.offlineTicksRemaining <= 0) {
        this.connected = true;
        this.offlineReason = null;
        console.log(`${this.tag} 📡 Signal RESTORED — disconnect resolved (${this.buffer.length} buffered messages to sync)`);
      }
      return;
    }

    // Weak signal zones: high chance of brief drops (1-5 ticks)
    if (wp.weakSignal && this.connected && this.rand() < 0.04) {
      this.connected = false;
      this.offlineReason = 'weak_signal';
      this.offlineTicksRemaining = 1 + Math.floor(this.rand() * 5);
      console.log(`${this.tag} 📡 Signal LOST — weak signal at ${wp.label} (EMI interference, ~${this.offlineTicksRemaining}s)`);
      return;
    }

    // Sporadic disconnection: random, anywhere, longer duration
    if (this.connected && this.rand() < SPORADIC_OFFLINE_CHANCE) {
      this.connected = false;
      this.offlineReason = 'sporadic';
      this.offlineTicksRemaining = SPORADIC_OFFLINE_MIN_TICKS +
        Math.floor(this.rand() * (SPORADIC_OFFLINE_MAX_TICKS - SPORADIC_OFFLINE_MIN_TICKS));
      console.log(`${this.tag} 📡 Signal LOST — sporadic disconnect near ${wp.label} (${this.offlineTicksRemaining}s)`);
    }
  }

  private updatePosition() {
    switch (this.state) {
      case 'charging':
        this.battery = Math.min(100, this.battery + BATTERY_CHARGE_RATE);
        if (this.battery >= BATTERY_FULL_THRESHOLD) {
          console.log(`${this.tag} Fully charged (${this.battery.toFixed(0)}%), resuming mission`);
          this.state = 'traveling';
          this.segmentProgress = 0;
          // Resume from the waypoint after the dock, or from the saved resume point
          this.currentWaypointIdx = this.resumeWaypointIdx >= 0
            ? this.resumeWaypointIdx
            : (DOCK_WAYPOINT_IDX + 1) % WAYPOINTS.length;
          this.resumeWaypointIdx = -1;
        }
        return;

      case 'inspecting':
        this.battery = Math.max(0, this.battery - BATTERY_DRAIN_INSPECTING);
        this.dwellRemaining--;
        if (this.dwellRemaining <= 0) {
          const wp = WAYPOINTS[this.currentWaypointIdx];
          console.log(`${this.tag} Inspection complete at ${wp.label}`);
          this.state = 'traveling';
          this.segmentProgress = 0;
          this.currentWaypointIdx = (this.currentWaypointIdx + 1) % WAYPOINTS.length;
          this.checkBatteryAndMaybeReturn();
        }
        return;

      case 'returning_to_dock':
        this.battery = Math.max(0, this.battery - BATTERY_DRAIN_TRAVELING);
        this.segmentProgress += this.travelSpeed;
        if (this.segmentProgress >= 1) {
          this.segmentProgress = 0;
          // Move backwards one waypoint toward the dock
          this.currentWaypointIdx = (this.currentWaypointIdx - 1 + WAYPOINTS.length) % WAYPOINTS.length;
          if (this.currentWaypointIdx === DOCK_WAYPOINT_IDX) {
            console.log(`${this.tag} Arrived at Dock — charging (battery ${this.battery.toFixed(0)}%)`);
            this.state = 'charging';
          }
        }
        return;

      case 'traveling':
        this.battery = Math.max(0, this.battery - BATTERY_DRAIN_TRAVELING);
        this.segmentProgress += this.travelSpeed;

        if (this.segmentProgress >= 1) {
          this.segmentProgress = 0;
          const nextIdx = (this.currentWaypointIdx + 1) % WAYPOINTS.length;
          this.currentWaypointIdx = nextIdx;
          const wp = WAYPOINTS[nextIdx];

          if (nextIdx === DOCK_WAYPOINT_IDX) {
            // Passed through the dock naturally — brief stop
            if (this.battery < BATTERY_LOW_THRESHOLD) {
              console.log(`${this.tag} At Dock, battery low (${this.battery.toFixed(0)}%) — charging`);
              this.state = 'charging';
              return;
            }
          }

          if (wp.dwellTicks > 0 && wp.inspectionPoint) {
            this.state = 'inspecting';
            this.dwellRemaining = wp.dwellTicks;
            console.log(`${this.tag} Arrived at ${wp.label} — inspecting for ${wp.dwellTicks}s (battery ${this.battery.toFixed(0)}%)`);
          } else if (wp.dwellTicks > 0) {
            this.dwellRemaining = wp.dwellTicks;
            this.state = 'inspecting';
          }

          this.checkBatteryAndMaybeReturn();
        }
        return;
    }
  }

  private checkBatteryAndMaybeReturn() {
    if (this.battery < BATTERY_LOW_THRESHOLD && this.state !== 'returning_to_dock' && this.state !== 'charging') {
      console.log(`${this.tag} Battery low (${this.battery.toFixed(0)}%) — returning to Dock`);
      this.resumeWaypointIdx = this.currentWaypointIdx;
      this.state = 'returning_to_dock';
      this.segmentProgress = 0;
    }
  }

  private getPosition(): { x: number; y: number; heading: number; speed: number } {
    const from = WAYPOINTS[this.currentWaypointIdx];

    if (this.state === 'inspecting' || this.state === 'charging') {
      return { x: from.x, y: from.y, heading: 0, speed: 0 };
    }

    const direction = this.state === 'returning_to_dock' ? -1 : 1;
    const nextIdx = (this.currentWaypointIdx + direction + WAYPOINTS.length) % WAYPOINTS.length;
    const to = WAYPOINTS[nextIdx];
    const frac = Math.min(this.segmentProgress, 1);

    const x = from.x + (to.x - from.x) * frac;
    const y = from.y + (to.y - from.y) * frac;
    const heading = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segmentLen = Math.sqrt(dx * dx + dy * dy);
    const speedMs = (this.travelSpeed * segmentLen) / (INTERVAL_MS / 1000);

    return { x, y, heading, speed: Math.round(speedMs * 100) / 100 };
  }

  private collectReadings() {
    // No sensor readings while charging or returning to dock
    if (this.state === 'charging' || this.state === 'returning_to_dock') return;

    const inspecting = this.state === 'inspecting';
    const wp = WAYPOINTS[this.currentWaypointIdx];
    const sensorsToPublish = inspecting ? SENSORS : SENSORS.slice(0, 2);
    const qualityBoost = inspecting ? 100 : 80;

    for (const asset of ASSETS) {
      for (const sensor of sensorsToPublish) {
        const isAnomaly = this.rand() < ANOMALY_RATE;
        const value = this.generateValue(sensor, isAnomaly);

        const reading = {
          robotId: this.robotId,
          assetId: asset.assetId,
          sensorId: `${sensor.sensorId}-${asset.name.toLowerCase().replace(/\s+/g, '-')}`,
          sensorType: sensor.sensorType,
          value: Math.round(value * 100) / 100,
          unit: sensor.unit,
          timestamp: new Date().toISOString(),
          quality: qualityBoost,
          metadata: {
            siteId: this.siteId,
            assetName: asset.name,
            missionId: `sim-mission-${String(this.robotIndex + 1).padStart(3, '0')}`,
            simulated: 'true',
            robotState: this.state,
            currentWaypoint: wp.label,
          },
        };

        const topic = `robots/${this.robotId}/sensors/${sensor.sensorType}/data`;
        this.enqueue(topic, JSON.stringify(reading), 1);

        if (isAnomaly) {
          console.log(`${this.tag} ANOMALY ${asset.name} ${sensor.sensorType}: ${reading.value} ${sensor.unit}${this.connected ? '' : ' (buffered)'}`);
        }
      }
    }

    if (this.tickCount % 60 === 0) {
      const bufInfo = this.buffer.length > 0 ? ` — buffer: ${this.buffer.length} msgs` : '';
      console.log(`${this.tag} ${this.state} at ${wp.label} — battery ${this.battery.toFixed(0)}% — signal: ${this.connected ? 'OK' : 'LOST'}${bufInfo}`);
    }
  }

  /** Poses are real-time only — published directly when connected, discarded when offline.
   *  Unlike sensor readings, stale poses would cause the dashboard to "teleport" robots
   *  through historical positions. The dashboard already shows "last known position" for
   *  offline robots, so there's no data gap to fill. */
  private collectPose() {
    if (!this.connected) return;

    const { x, y, heading, speed } = this.getPosition();
    const wp = WAYPOINTS[this.currentWaypointIdx];

    const pose = {
      robotId: this.robotId,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: 0,
      heading: Math.round(heading * 10) / 10,
      speed,
      batteryLevel: Math.round(this.battery * 10) / 10,
      timestamp: new Date().toISOString(),
      siteId: this.siteId,
      missionId: `sim-mission-${String(this.robotIndex + 1).padStart(3, '0')}`,
      waypointIndex: this.currentWaypointIdx,
      state: this.state,
      currentWaypoint: wp.label,
    };

    const topic = `robots/${this.robotId}/pose`;
    this.client.publish(topic, JSON.stringify(pose), { qos: 0 });
  }

  private generateValue(sensor: SensorConfig, isAnomaly: boolean): number {
    const drifted = sensor.baseline + sensor.drift * this.tickCount;
    const noise = (this.rand() - 0.5) * 2 * sensor.noise;
    const base = drifted + noise;
    if (isAnomaly) return base + sensor.anomalySpike * (0.5 + this.rand() * 0.5);
    return base;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     ANYmal Robot Simulator                    ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║ Broker:       ${BROKER_URL.padEnd(30)}║`);
  console.log(`║ Robots:       ${String(ROBOT_COUNT).padEnd(30)}║`);
  console.log(`║ Interval:     ${(INTERVAL_MS + 'ms').padEnd(30)}║`);
  console.log(`║ Anomaly Rate: ${(ANOMALY_RATE * 100 + '%').padEnd(30)}║`);
  console.log(`║ Battery Low:  ${(BATTERY_LOW_THRESHOLD + '%').padEnd(30)}║`);
  console.log(`║ Charge Rate:  ${(BATTERY_CHARGE_RATE + '%/s').padEnd(30)}║`);
  console.log(`║ Sporadic drop:${(SPORADIC_OFFLINE_CHANCE * 100 + '% / tick').padEnd(30)}║`);
  console.log(`║ Buffer size:  ${(MAX_BUFFER_SIZE + ' msgs max').padEnd(30)}║`);
  console.log(`║ Flush rate:   ${(FLUSH_BATCH_SIZE + ' msgs / tick').padEnd(30)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('Inspection waypoints:');
  WAYPOINTS.filter((wp) => wp.inspectionPoint).forEach((wp) => {
    const signal = wp.deadZone ? '🔴 no signal' : wp.weakSignal ? '🟡 weak' : '🟢 OK';
    console.log(`  ${wp.label.padEnd(22)} dwell ${String(wp.dwellTicks).padEnd(3)}s  signal: ${signal}`);
  });
  console.log('');
  console.log('Dead zones (no connectivity):');
  WAYPOINTS.filter((wp) => wp.deadZone).forEach((wp) => {
    console.log(`  🔴 ${wp.label}`);
  });
  console.log('Weak signal zones (intermittent drops):');
  WAYPOINTS.filter((wp) => wp.weakSignal).forEach((wp) => {
    console.log(`  🟡 ${wp.label}`);
  });
  console.log('');
  console.log('Robots:');
  for (let i = 0; i < ROBOT_COUNT; i++) {
    const name = ROBOT_NAMES[i] ?? `Robot-${i}`;
    const startBattery = 55 + i * 8;
    const startWp = WAYPOINTS[(i * Math.floor(WAYPOINTS.length / ROBOT_COUNT)) % WAYPOINTS.length].label;
    console.log(`  ${name.padEnd(10)} ${makeRobotId(i)}  start: ${startWp.padEnd(20)} battery: ${startBattery}%`);
  }
  console.log('');

  const simulators: RobotSimulator[] = [];

  for (let i = 0; i < ROBOT_COUNT; i++) {
    const sim = new RobotSimulator(BROKER_URL, i);
    simulators.push(sim);
    await sim.start();
  }

  console.log(`\nAll ${ROBOT_COUNT} robot(s) publishing. Press Ctrl+C to stop.\n`);
}

main().catch(console.error);
