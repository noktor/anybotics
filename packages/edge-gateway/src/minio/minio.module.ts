import { Module } from '@nestjs/common';
import { MinioUploadService } from './minio-upload.service';

@Module({
  providers: [MinioUploadService],
  exports: [MinioUploadService],
})
export class MinioModule {}
