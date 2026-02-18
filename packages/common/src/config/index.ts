import { z } from 'zod';

export const BaseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export const KafkaConfigSchema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('anybotics'),
  KAFKA_GROUP_ID: z.string().optional(),
});

export const MqttConfigSchema = z.object({
  MQTT_BROKER_URL: z.string().default('mqtt://localhost:1883'),
  MQTT_CLIENT_ID: z.string().optional(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
});

export const TimescaleConfigSchema = z.object({
  TIMESCALE_HOST: z.string().default('localhost'),
  TIMESCALE_PORT: z.coerce.number().default(5432),
  TIMESCALE_USER: z.string().default('anybotics'),
  TIMESCALE_PASSWORD: z.string().default('anybotics'),
  TIMESCALE_DATABASE: z.string().default('anybotics'),
});

export const RedisConfigSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

export const MinioConfigSchema = z.object({
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('inspection-data'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
});

export const AuthConfigSchema = z.object({
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
});

export function loadConfig<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Configuration validation failed:\n${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}
