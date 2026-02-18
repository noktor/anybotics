import { Module } from '@nestjs/common';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { ThresholdDetector } from './detectors/threshold.detector';
import { ZScoreDetector } from './detectors/zscore.detector';

@Module({
  providers: [AnomalyDetectionService, ThresholdDetector, ZScoreDetector],
  exports: [AnomalyDetectionService],
})
export class AnomalyModule {}
