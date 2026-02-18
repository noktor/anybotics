import { Injectable } from '@nestjs/common';
import {
  SensorReading,
  AnomalyEvent,
  AnomalyRule,
  AnomalyType,
  generateId,
} from '@anybotics/common';

interface SlidingWindow {
  values: number[];
  sum: number;
  sumSquares: number;
}

@Injectable()
export class ZScoreDetector {
  private windows = new Map<string, SlidingWindow>();
  private readonly defaultWindowSize = 1000;

  private getKey(reading: SensorReading): string {
    return `${reading.assetId}:${reading.sensorId}`;
  }

  addSample(reading: SensorReading): void {
    const key = this.getKey(reading);
    let window = this.windows.get(key);

    if (!window) {
      window = { values: [], sum: 0, sumSquares: 0 };
      this.windows.set(key, window);
    }

    window.values.push(reading.value);
    window.sum += reading.value;
    window.sumSquares += reading.value * reading.value;

    if (window.values.length > this.defaultWindowSize) {
      const removed = window.values.shift()!;
      window.sum -= removed;
      window.sumSquares -= removed * removed;
    }
  }

  evaluate(reading: SensorReading, rule: AnomalyRule): AnomalyEvent | null {
    const key = this.getKey(reading);
    const window = this.windows.get(key);

    if (!window || window.values.length < 30) {
      this.addSample(reading);
      return null;
    }

    const n = window.values.length;
    const mean = window.sum / n;
    const variance = window.sumSquares / n - mean * mean;
    const stddev = Math.sqrt(Math.max(0, variance));

    if (stddev === 0) {
      this.addSample(reading);
      return null;
    }

    const zScore = Math.abs((reading.value - mean) / stddev);
    const threshold = rule.zScoreThreshold ?? 3.0;

    if (zScore > threshold) {
      const unit = reading.unit ?? '';
      const assetName = reading.metadata?.assetName ?? reading.assetId;
      const sensorLabel = reading.sensorType.replace(/_/g, ' ');
      const location = reading.metadata?.currentWaypoint;
      const locationSuffix = location ? ` near ${location}` : '';

      return {
        anomalyId: generateId(),
        robotId: reading.robotId,
        assetId: reading.assetId,
        sensorId: reading.sensorId,
        severity: rule.severity,
        anomalyType: AnomalyType.STATISTICAL_OUTLIER,
        description: `Statistical outlier in ${sensorLabel} on ${assetName}: ${reading.value}${unit} (z=${zScore.toFixed(1)}, mean=${mean.toFixed(1)}${unit})${locationSuffix}`,
        value: reading.value,
        threshold: mean + threshold * stddev,
        timestamp: reading.timestamp,
        metadata: {
          sensorType: reading.sensorType,
          unit,
          assetName,
          zScore: zScore.toFixed(2),
          mean: mean.toFixed(2),
          stddev: stddev.toFixed(2),
          ...(reading.metadata?.currentWaypoint && { currentWaypoint: reading.metadata.currentWaypoint }),
          ...(reading.metadata?.siteId && { siteId: reading.metadata.siteId }),
        },
      };
    }

    this.addSample(reading);
    return null;
  }
}
