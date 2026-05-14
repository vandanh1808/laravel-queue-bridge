---
description: Generate code that uses laravel-queue-bridge to consume or produce Laravel Queue messages in Node.js/TypeScript (NestJS, Express, etc.)
trigger: When the user needs to integrate with Laravel Queue via RabbitMQ — consuming messages from Laravel or producing messages that Laravel workers can process.
---

# laravel-queue-bridge

## What this library does

Bridge between Laravel Queue and Node.js/TypeScript. Laravel Queue publishes jobs to RabbitMQ as a JSON envelope wrapping a PHP `serialize()` string. This library handles both directions:

- **Consumer**: `parseLaravelQueueMessage(raw)` — deserialize Laravel messages into plain JS objects
- **Producer**: `createLaravelQueueMessage(options)` — create messages that Laravel can `unserialize()` natively

## Installation

```bash
npm install laravel-queue-bridge
```

## Exports

```ts
import {
  parseLaravelQueueMessage,   // Laravel → Node.js (consumer)
  createLaravelQueueMessage,  // Node.js → Laravel (producer)
  phpUnserialize,             // Low-level: PHP serialize string → JS value
  phpSerialize,               // Low-level: JS value → PHP serialize string
  phpSerializeObject,         // Low-level: JS → PHP object with class name + visibility
  PhpUnserializeError,        // Error class for parse failures
} from 'laravel-queue-bridge';

// TypeScript types
import type {
  LaravelQueueMessage,
  LaravelQueueEnvelope,
  CreateLaravelQueueMessageOptions,
  PhpVisibility,              // 'public' | 'protected' | 'private'
  SerializeObjectOptions,
} from 'laravel-queue-bridge';
```

## Consumer pattern — receive messages from Laravel

Use `parseLaravelQueueMessage()` to parse incoming RabbitMQ messages dispatched by Laravel.

### Function signature

```ts
function parseLaravelQueueMessage<T = Record<string, any>>(
  raw: Buffer | string,
): LaravelQueueMessage<T>;

interface LaravelQueueMessage<T> {
  uuid: string;        // Job UUID
  jobName: string;     // "App\\Jobs\\UserChangedJob"
  shortName: string;   // "UserChangedJob"
  properties: T;       // Deserialized properties (visibility prefixes auto-stripped)
  attempts: number;
}
```

### Key behaviors

- Accepts both `Buffer` (from amqplib `msg.content`) and `string`
- Automatically strips PHP visibility prefixes (`\0ClassName\0` for private, `\0*\0` for protected)
- Returns clean property names regardless of PHP visibility
- Throws `PhpUnserializeError` on malformed input

### Example: NestJS consuming from Laravel

```ts
import { parseLaravelQueueMessage } from 'laravel-queue-bridge';

// In your RabbitMQ consumer service
channel.consume(queue, (msg) => {
  if (!msg) return;

  try {
    const { jobName, shortName, properties } = parseLaravelQueueMessage(msg.content);

    // Route to handler based on jobName
    const handler = this.handlerMap.get(jobName);
    if (handler) {
      handler.handle(properties);
    }

    channel.ack(msg);
  } catch (err) {
    channel.nack(msg, false, false);
  }
});
```

### Example: with TypeScript generics

```ts
interface UserChangedProps {
  type: 'create' | 'update' | 'delete';
  payload: { id: number; name: string; email: string } | number;
}

const msg = parseLaravelQueueMessage<UserChangedProps>(raw);
// msg.properties.type is typed as 'create' | 'update' | 'delete'
```

## Producer pattern — send messages to Laravel

Use `createLaravelQueueMessage()` to create messages that Laravel Queue workers can process.

### Function signature

```ts
function createLaravelQueueMessage(options: CreateLaravelQueueMessageOptions): string;

interface CreateLaravelQueueMessageOptions {
  jobName: string;                                              // PHP FQCN
  properties: Record<string, any>;                              // Job properties
  visibility?: PhpVisibility | Record<string, PhpVisibility>;   // Default: 'public'
  uuid?: string;                                                // Auto-generated if omitted
  attempts?: number;                                            // Default: 0
}

type PhpVisibility = 'public' | 'protected' | 'private';
```

### CRITICAL: visibility must match the PHP class

PHP `serialize()` encodes property visibility into keys with null-byte prefixes. If the Node.js producer doesn't match the PHP class visibility, Laravel `unserialize()` will create the object but properties will be `null`.

| PHP declaration | visibility value |
|----------------|-----------------|
| `public $prop` | `'public'` (default, can omit) |
| `protected $prop` | `'protected'` |
| `private $prop` | `'private'` |

### Example: producing for a Laravel job class

Given this PHP job class:

```php
class CompanyChangedJob implements ShouldQueue {
    private string $action;      // private
    protected $payload;          // protected (inherited from base)
}
```

The Node.js producer must specify matching visibility:

```ts
const message = createLaravelQueueMessage({
  jobName: 'App/Jobs/CompanyChangedJob',   // forward slashes OK (auto-converted to \\)
  properties: {
    action: 'create',
    payload: { id: 1, name: 'ABC Corp' },
  },
  visibility: {
    action: 'private',
    payload: 'protected',
  },
});

channel.publish(exchange, routingKey, Buffer.from(message), {
  persistent: true,
  contentType: 'application/json',
});
```

### Example: all properties same visibility

```ts
// All protected
createLaravelQueueMessage({
  jobName: 'App/Jobs/SomeJob',
  properties: { data: 'value' },
  visibility: 'protected',  // string applies to ALL properties
});

// All public (default — no visibility needed)
createLaravelQueueMessage({
  jobName: 'App/Jobs/SimpleJob',
  properties: { payload: [1, 2, 3] },
});
```

### Example: full NestJS publish service

```ts
import { createLaravelQueueMessage } from 'laravel-queue-bridge';

async publish(
  routingKey: string,
  jobName: string,
  properties: Record<string, any>,
  visibility?: Record<string, PhpVisibility>,
) {
  const message = createLaravelQueueMessage({
    jobName,
    properties,
    visibility,
  });

  this.channel.publish(
    this.exchange,
    routingKey,
    Buffer.from(message),
    { persistent: true, contentType: 'application/json' },
  );
}

// Usage
await this.publish('tnet', 'App/Jobs/CompanyChangedJob',
  { action: 'create', payload: { id: 1, name: 'Test' } },
  { action: 'private', payload: 'protected' },
);
```

## Low-level API

### phpUnserialize

```ts
phpUnserialize('s:5:"hello";');           // "hello"
phpUnserialize('i:42;');                  // 42
phpUnserialize('d:3.14;');               // 3.14
phpUnserialize('b:1;');                  // true
phpUnserialize('N;');                    // null
phpUnserialize('a:1:{s:2:"id";i:1;}');  // { id: 1 }
```

Handles: UTF-8 multi-byte (byte length), INF/-INF/NAN, nested structures, visibility prefixes.

### phpSerialize

```ts
phpSerialize('hello');           // 's:5:"hello";'
phpSerialize(42);                // 'i:42;'
phpSerialize({ id: 1 });        // 'a:1:{s:2:"id";i:1;}'
phpSerialize([10, 20]);         // 'a:2:{i:0;i:10;i:1;i:20;}'
phpSerialize('Hello 世界');      // 's:12:"Hello 世界";'  (byte length)
```

### phpSerializeObject

```ts
phpSerializeObject('App\\Jobs\\MyJob', { action: 'test' }, {
  visibility: { action: 'private' },
});
// O:15:"App\Jobs\MyJob":1:{s:23:"\0App\Jobs\MyJob\0action";s:4:"test";}
```

## Common real-world job patterns

These patterns are based on typical Laravel microservice architectures:

```ts
// UserChangedJob: private $type, public $payload
createLaravelQueueMessage({
  jobName: 'App/Jobs/UserChangedJob',
  properties: { type: 'create', payload: { id: 100, name: 'User' } },
  visibility: { type: 'private' },
});

// CompanyChangedJob: private $action, protected $payload
createLaravelQueueMessage({
  jobName: 'App/Jobs/CompanyChangedJob',
  properties: { action: 'update', payload: { id: 1, name: 'Corp' } },
  visibility: { action: 'private', payload: 'protected' },
});

// UserServiceActivationChangeJob: protected $payload (inherited)
createLaravelQueueMessage({
  jobName: 'App/Jobs/UserServiceActivationChangeJob',
  properties: { payload: { userId: 100, serviceCode: 'contact', type: 'add' } },
  visibility: { payload: 'protected' },
});

// CompanyBatchUpdatedJob: public $payload (no visibility needed)
createLaravelQueueMessage({
  jobName: 'App/Jobs/CompanyBatchUpdatedJob',
  properties: { payload: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
});
```
