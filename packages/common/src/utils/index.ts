import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

export function toISOTimestamp(date: Date): string {
  return date.toISOString();
}

export function fromISOTimestamp(iso: string): Date {
  return new Date(iso);
}

export function parseMqttTopic(topic: string): { robotId?: string; sensorType?: string; isPose?: boolean } {
  const parts = topic.split('/');
  if (parts[0] !== 'robots' || !parts[1]) return {};

  // robots/{robotId}/pose
  if (parts.length === 3 && parts[2] === 'pose') {
    return { robotId: parts[1], isPose: true };
  }
  // robots/{robotId}/sensors/{sensorType}/data|blob
  if (parts.length >= 4 && parts[2] === 'sensors') {
    return { robotId: parts[1], sensorType: parts[3] };
  }
  return { robotId: parts[1] };
}

export function buildMqttTopic(pattern: string, params: Record<string, string>): string {
  let topic = pattern;
  for (const [key, value] of Object.entries(params)) {
    topic = topic.replace(`{${key}}`, value);
  }
  return topic;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
