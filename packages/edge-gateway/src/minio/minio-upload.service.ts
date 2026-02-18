import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioUploadService implements OnModuleInit {
  private readonly logger = new Logger(MinioUploadService.name);
  private client!: Minio.Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'inspection-data');

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }

    this.logger.log(`MinIO client initialized (bucket: ${this.bucket})`);
  }

  async uploadBlob(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string> {
    const objectName = path;

    await this.client.putObject(this.bucket, objectName, data, data.length, {
      'Content-Type': contentType,
    });

    const uri = `s3://${this.bucket}/${objectName}`;
    this.logger.debug(`Uploaded blob: ${uri} (${data.length} bytes)`);
    return uri;
  }

  async getPresignedUrl(path: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, path, expirySeconds);
  }
}
