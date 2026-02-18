import { Injectable } from '@nestjs/common';
import {
  SensorReading,
  AnomalyEvent,
  AnomalyRule,
  AnomalyType,
  generateId,
} from '@anybotics/common';

@Injectable()
export class ThresholdDetector {
  evaluate(reading: SensorReading, rule: AnomalyRule): AnomalyEvent | null {
    const { value } = reading;
    const { maxThreshold, minThreshold, severity } = rule;
    const unit = reading.unit ?? '';
    const assetName = reading.metadata?.assetName ?? reading.assetId;
    const sensorLabel = reading.sensorType.replace(/_/g, ' ');
    const location = reading.metadata?.currentWaypoint;
    const locationSuffix = location ? ` near ${location}` : '';

    if (maxThreshold !== undefined && maxThreshold !== null && value > maxThreshold) {
      return {
        anomalyId: generateId(),
        robotId: reading.robotId,
        assetId: reading.assetId,
        sensorId: reading.sensorId,
        severity,
        anomalyType: AnomalyType.THRESHOLD_VIOLATION,
        description: `High ${sensorLabel} on ${assetName}: ${value}${unit} (max: ${maxThreshold}${unit})${locationSuffix}`,
        value,
        threshold: maxThreshold,
        timestamp: reading.timestamp,
        metadata: {
          sensorType: reading.sensorType,
          unit,
          assetName,
          ...(reading.metadata?.currentWaypoint && { currentWaypoint: reading.metadata.currentWaypoint }),
          ...(reading.metadata?.siteId && { siteId: reading.metadata.siteId }),
        },
      };
    }

    if (minThreshold !== undefined && minThreshold !== null && value < minThreshold) {
      return {
        anomalyId: generateId(),
        robotId: reading.robotId,
        assetId: reading.assetId,
        sensorId: reading.sensorId,
        severity,
        anomalyType: AnomalyType.THRESHOLD_VIOLATION,
        description: `Low ${sensorLabel} on ${assetName}: ${value}${unit} (min: ${minThreshold}${unit})${locationSuffix}`,
        value,
        threshold: minThreshold,
        timestamp: reading.timestamp,
        metadata: {
          sensorType: reading.sensorType,
          unit,
          assetName,
          ...(reading.metadata?.currentWaypoint && { currentWaypoint: reading.metadata.currentWaypoint }),
          ...(reading.metadata?.siteId && { siteId: reading.metadata.siteId }),
        },
      };
    }

    return null;
  }
}
