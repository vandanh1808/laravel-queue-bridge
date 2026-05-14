export interface LaravelQueueMessage<T = Record<string, any>> {
  uuid: string;
  jobName: string;
  shortName: string;
  properties: T;
  attempts: number;
}

export interface LaravelQueueEnvelope {
  uuid?: string;
  job: string;
  data: {
    commandName: string;
    command: string;
  };
  attempts?: number;
}

export interface CreateLaravelQueueMessageOptions {
  jobName: string;
  properties: Record<string, any>;
  visibility?: PhpVisibility | Record<string, PhpVisibility>;
  uuid?: string;
  attempts?: number;
}

export type PhpVisibility = 'public' | 'protected' | 'private';

export interface SerializeObjectOptions {
  visibility?: PhpVisibility | Record<string, PhpVisibility>;
}
