import { randomUUID } from 'crypto';
import { phpSerializeObject } from './php-serializer';
import { phpUnserialize } from './php-unserializer';
import type {
  LaravelQueueMessage,
  LaravelQueueEnvelope,
  CreateLaravelQueueMessageOptions,
  SerializeObjectOptions,
} from './types';

const LARAVEL_QUEUE_HANDLER = 'Illuminate\\Queue\\CallQueuedHandler@call';

export function parseLaravelQueueMessage<T = Record<string, any>>(
  raw: Buffer | string,
): LaravelQueueMessage<T> {
  const text = typeof raw === 'string' ? raw : raw.toString('utf-8');

  let envelope: LaravelQueueEnvelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error(
      'Failed to parse Laravel Queue message: invalid JSON envelope',
    );
  }

  if (!envelope.data?.commandName || !envelope.data?.command) {
    throw new Error(
      'Failed to parse Laravel Queue message: missing data.commandName or data.command',
    );
  }

  const jobName = envelope.data.commandName;
  const properties = phpUnserialize(envelope.data.command) as T;

  return {
    uuid: envelope.uuid ?? '',
    jobName,
    shortName: extractShortName(jobName),
    properties,
    attempts: envelope.attempts ?? 0,
  };
}

export function createLaravelQueueMessage(
  options: CreateLaravelQueueMessageOptions,
): string {
  const {
    jobName: rawJobName,
    properties,
    visibility,
    uuid = randomUUID(),
    attempts = 0,
  } = options;

  const jobName = normalizeNamespace(rawJobName);
  const serializeOptions: SerializeObjectOptions | undefined =
    visibility ? { visibility } : undefined;
  const command = phpSerializeObject(jobName, properties, serializeOptions);

  return JSON.stringify({
    uuid,
    job: LARAVEL_QUEUE_HANDLER,
    data: {
      commandName: jobName,
      command,
    },
    attempts,
  });
}

function normalizeNamespace(name: string): string {
  return name.replace(/\//g, '\\');
}

function extractShortName(fqcn: string): string {
  const parts = fqcn.split('\\');
  return parts[parts.length - 1];
}
