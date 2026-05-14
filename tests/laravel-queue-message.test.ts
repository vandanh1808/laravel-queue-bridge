import {
  parseLaravelQueueMessage,
  createLaravelQueueMessage,
  PhpUnserializeError,
} from '../src';

describe('parseLaravelQueueMessage', () => {
  // ── Helper ──

  function createEnvelope(
    jobClass: string,
    serializedCommand: string,
    overrides: Record<string, any> = {},
  ) {
    return JSON.stringify({
      uuid: 'test-uuid-123',
      job: 'Illuminate\\Queue\\CallQueuedHandler@call',
      data: {
        commandName: jobClass,
        command: serializedCommand,
      },
      attempts: 0,
      ...overrides,
    });
  }

  // ═══════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════

  describe('return structure', () => {
    const command = 'O:8:"stdClass":1:{s:3:"foo";s:3:"bar";}';

    it('returns uuid from envelope', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\SomeJob', command),
      );
      expect(msg.uuid).toBe('test-uuid-123');
    });

    it('returns full jobName (FQCN)', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );
      expect(msg.jobName).toBe('App\\Jobs\\UserChangedJob');
    });

    it('extracts shortName from namespace', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );
      expect(msg.shortName).toBe('UserChangedJob');
    });

    it('shortName works for deeply namespaced class', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope(
          'App\\Infrastructure\\Jobs\\Nested\\DeepJob',
          command,
        ),
      );
      expect(msg.shortName).toBe('DeepJob');
    });

    it('shortName works for class without namespace', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('SimpleJob', command),
      );
      expect(msg.shortName).toBe('SimpleJob');
    });

    it('returns attempts count', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\SomeJob', command, { attempts: 3 }),
      );
      expect(msg.attempts).toBe(3);
    });

    it('returns deserialized properties', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\SomeJob', command),
      );
      expect(msg.properties).toEqual({ foo: 'bar' });
    });
  });

  // ═══════════════════════════════════════════
  // Input formats
  // ═══════════════════════════════════════════

  describe('input formats', () => {
    const command = 'O:8:"stdClass":1:{s:3:"foo";s:3:"bar";}';

    it('accepts string input', () => {
      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\SomeJob', command),
      );
      expect(msg.properties).toEqual({ foo: 'bar' });
    });

    it('accepts Buffer input', () => {
      const raw = Buffer.from(
        createEnvelope('App\\SomeJob', command),
      );
      const msg = parseLaravelQueueMessage(raw);
      expect(msg.properties).toEqual({ foo: 'bar' });
    });

    it('accepts UTF-8 Buffer input', () => {
      const cmd =
        'O:8:"stdClass":1:{s:4:"name";s:12:"Hello 世界";}';
      const raw = Buffer.from(
        createEnvelope('App\\SomeJob', cmd),
        'utf-8',
      );
      const msg = parseLaravelQueueMessage(raw);
      expect(msg.properties).toEqual({ name: 'Hello 世界' });
    });
  });

  // ═══════════════════════════════════════════
  // Default values
  // ═══════════════════════════════════════════

  describe('default values', () => {
    it('uuid defaults to empty string when missing', () => {
      const envelope = JSON.stringify({
        job: 'handler',
        data: {
          commandName: 'App\\SomeJob',
          command: 'O:8:"stdClass":0:{}',
        },
      });
      const msg = parseLaravelQueueMessage(envelope);
      expect(msg.uuid).toBe('');
    });

    it('attempts defaults to 0 when missing', () => {
      const envelope = JSON.stringify({
        job: 'handler',
        data: {
          commandName: 'App\\SomeJob',
          command: 'O:8:"stdClass":0:{}',
        },
      });
      const msg = parseLaravelQueueMessage(envelope);
      expect(msg.attempts).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // Real-world: tContact jobs
  // ═══════════════════════════════════════════

  describe('tContact jobs', () => {
    it('UserChangedJob — create', () => {
      const command =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"create";' +
        's:7:"payload";a:9:{' +
        's:2:"id";i:100;' +
        's:4:"name";s:12:"Nguyen Van A";' +
        's:8:"username";s:10:"nguyenvana";' +
        's:5:"email";s:22:"nguyenvana@example.com";' +
        's:8:"isActive";b:1;' +
        's:6:"avatar";s:30:"https://example.com/avatar.jpg";' +
        's:5:"phone";s:10:"0901234567";' +
        's:9:"signature";s:12:"Best regards";' +
        's:10:"department";s:11:"Engineering";' +
        '}}';

      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );

      expect(msg.shortName).toBe('UserChangedJob');
      expect(msg.properties.type).toBe('create');
      expect(msg.properties.payload).toEqual({
        id: 100,
        name: 'Nguyen Van A',
        username: 'nguyenvana',
        email: 'nguyenvana@example.com',
        isActive: true,
        avatar: 'https://example.com/avatar.jpg',
        phone: '0901234567',
        signature: 'Best regards',
        department: 'Engineering',
      });
    });

    it('UserChangedJob — update', () => {
      const command =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"update";' +
        's:7:"payload";a:9:{' +
        's:2:"id";i:100;' +
        's:4:"name";s:22:"Nguyen Van A (Updated)";' +
        's:8:"username";s:10:"nguyenvana";' +
        's:5:"email";s:30:"nguyenvana.updated@example.com";' +
        's:8:"isActive";b:1;' +
        's:6:"avatar";s:34:"https://example.com/avatar-new.jpg";' +
        's:5:"phone";s:10:"0907654321";' +
        's:9:"signature";s:17:"Updated signature";' +
        's:10:"department";s:7:"Product";' +
        '}}';

      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );

      expect(msg.properties.type).toBe('update');
      expect(msg.properties.payload.name).toBe('Nguyen Van A (Updated)');
      expect(msg.properties.payload.email).toBe(
        'nguyenvana.updated@example.com',
      );
    });

    it('UserChangedJob — delete (payload is integer)', () => {
      const command =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"delete";' +
        's:7:"payload";i:100;}';

      const msg = parseLaravelQueueMessage(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );

      expect(msg.properties.type).toBe('delete');
      expect(msg.properties.payload).toBe(100);
    });

    it('UserServiceActivationChangeJob — add', () => {
      const command =
        'O:39:"App\\Jobs\\UserServiceActivationChangeJob":1:{' +
        's:7:"payload";a:3:{' +
        's:6:"userId";i:100;' +
        's:11:"serviceCode";s:7:"contact";' +
        's:4:"type";s:3:"add";' +
        '}}';

      const msg = parseLaravelQueueMessage(
        createEnvelope(
          'App\\Jobs\\UserServiceActivationChangeJob',
          command,
        ),
      );

      expect(msg.shortName).toBe('UserServiceActivationChangeJob');
      expect(msg.properties.payload).toEqual({
        userId: 100,
        serviceCode: 'contact',
        type: 'add',
      });
    });

    it('UserServiceActivationChangeJob — remove', () => {
      const command =
        'O:39:"App\\Jobs\\UserServiceActivationChangeJob":1:{' +
        's:7:"payload";a:3:{' +
        's:6:"userId";i:100;' +
        's:11:"serviceCode";s:7:"contact";' +
        's:4:"type";s:6:"remove";' +
        '}}';

      const msg = parseLaravelQueueMessage(
        createEnvelope(
          'App\\Jobs\\UserServiceActivationChangeJob',
          command,
        ),
      );

      expect(msg.properties.payload.type).toBe('remove');
    });

    it('parses real message captured from RabbitMQ debug log', () => {
      // This is an actual message from the demo producer
      const raw = JSON.stringify({
        uuid: '549128f7-4814-4bd8-bdb9-455b38f28078',
        job: 'Illuminate\\Queue\\CallQueuedHandler@call',
        data: {
          commandName: 'App\\Jobs\\UserChangedJob',
          command:
            'O:23:"App\\Jobs\\UserChangedJob":2:{s:4:"type";s:6:"create";s:7:"payload";a:9:{s:2:"id";i:100;s:4:"name";s:12:"Nguyen Van A";s:8:"username";s:10:"nguyenvana";s:5:"email";s:22:"nguyenvana@example.com";s:8:"isActive";b:1;s:6:"avatar";s:30:"https://example.com/avatar.jpg";s:5:"phone";s:10:"0901234567";s:9:"signature";s:12:"Best regards";s:10:"department";s:11:"Engineering";}}',
        },
        attempts: 0,
      });

      const msg = parseLaravelQueueMessage(raw);
      expect(msg.uuid).toBe('549128f7-4814-4bd8-bdb9-455b38f28078');
      expect(msg.shortName).toBe('UserChangedJob');
      expect(msg.properties.type).toBe('create');
      expect(msg.properties.payload.id).toBe(100);
      expect(msg.properties.payload.name).toBe('Nguyen Van A');
    });
  });

  // ═══════════════════════════════════════════
  // TypeScript generic support
  // ═══════════════════════════════════════════

  describe('generic type parameter', () => {
    interface UserJobProps {
      type: string;
      payload: { id: number; name: string };
    }

    it('allows typed properties via generic', () => {
      const command =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"create";' +
        's:7:"payload";a:2:{s:2:"id";i:1;s:4:"name";s:4:"test";}}';

      const msg = parseLaravelQueueMessage<UserJobProps>(
        createEnvelope('App\\Jobs\\UserChangedJob', command),
      );

      // TypeScript knows msg.properties.type is string
      expect(msg.properties.type).toBe('create');
      expect(msg.properties.payload.id).toBe(1);
    });
  });

  // ═══════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════

  describe('error handling', () => {
    it('throws on invalid JSON input', () => {
      expect(() => parseLaravelQueueMessage('not json')).toThrow(
        'invalid JSON',
      );
    });

    it('throws on missing data field', () => {
      expect(() =>
        parseLaravelQueueMessage(JSON.stringify({ job: 'handler' })),
      ).toThrow('missing data.commandName');
    });

    it('throws on missing data.commandName', () => {
      const bad = JSON.stringify({
        data: { command: 'O:8:"stdClass":0:{}' },
      });
      expect(() => parseLaravelQueueMessage(bad)).toThrow(
        'missing data.commandName',
      );
    });

    it('throws on missing data.command', () => {
      const bad = JSON.stringify({
        data: { commandName: 'App\\SomeJob' },
      });
      expect(() => parseLaravelQueueMessage(bad)).toThrow(
        'missing data.commandName or data.command',
      );
    });

    it('throws PhpUnserializeError on malformed command', () => {
      const bad = createEnvelope('App\\SomeJob', 'INVALID_PHP_SERIALIZED');
      expect(() => parseLaravelQueueMessage(bad)).toThrow(
        PhpUnserializeError,
      );
    });

    it('throws on empty command string', () => {
      const bad = createEnvelope('App\\SomeJob', '');
      expect(() => parseLaravelQueueMessage(bad)).toThrow();
    });

    it('throws on null data field', () => {
      const bad = JSON.stringify({ data: null });
      expect(() => parseLaravelQueueMessage(bad)).toThrow();
    });
  });
});

// ═══════════════════════════════════════════════
// createLaravelQueueMessage
// ═══════════════════════════════════════════════

describe('createLaravelQueueMessage', () => {
  // ── Envelope structure ──

  describe('envelope structure', () => {
    it('produces valid JSON', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: { foo: 'bar' },
      });
      expect(() => JSON.parse(msg)).not.toThrow();
    });

    it('sets job to CallQueuedHandler@call', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: {},
      });
      const envelope = JSON.parse(msg);
      expect(envelope.job).toBe('Illuminate\\Queue\\CallQueuedHandler@call');
    });

    it('sets data.commandName to jobName', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties: {},
      });
      const envelope = JSON.parse(msg);
      expect(envelope.data.commandName).toBe('App\\Jobs\\UserChangedJob');
    });

    it('auto-generates uuid when not provided', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: {},
      });
      const envelope = JSON.parse(msg);
      expect(envelope.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('uses provided uuid', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: {},
        uuid: 'custom-uuid-123',
      });
      const envelope = JSON.parse(msg);
      expect(envelope.uuid).toBe('custom-uuid-123');
    });

    it('defaults attempts to 0', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: {},
      });
      const envelope = JSON.parse(msg);
      expect(envelope.attempts).toBe(0);
    });

    it('uses provided attempts', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: {},
        attempts: 3,
      });
      const envelope = JSON.parse(msg);
      expect(envelope.attempts).toBe(3);
    });

    it('data.command is a PHP serialized object string', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: { type: 'create' },
      });
      const envelope = JSON.parse(msg);
      expect(envelope.data.command).toMatch(/^O:\d+:".*":\d+:\{.*\}$/);
    });
  });

  // ── Roundtrip: create → parse ──

  describe('roundtrip: create → parse', () => {
    it('simple properties', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties: { type: 'create', id: 42 },
        uuid: 'test-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.uuid).toBe('test-uuid');
      expect(parsed.jobName).toBe('App\\Jobs\\UserChangedJob');
      expect(parsed.shortName).toBe('UserChangedJob');
      expect(parsed.properties).toEqual({ type: 'create', id: 42 });
      expect(parsed.attempts).toBe(0);
    });

    it('nested payload', () => {
      const properties = {
        type: 'create',
        payload: {
          id: 100,
          name: 'Nguyen Van A',
          email: 'nguyenvana@example.com',
          isActive: true,
          avatar: 'https://example.com/avatar.jpg',
        },
      };

      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties,
        uuid: 'roundtrip-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties).toEqual(properties);
    });

    it('delete job (payload is integer)', () => {
      const properties = { type: 'delete', payload: 100 };
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties,
        uuid: 'del-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties.type).toBe('delete');
      expect(parsed.properties.payload).toBe(100);
    });

    it('UserServiceActivationChangeJob', () => {
      const properties = {
        payload: { userId: 100, serviceCode: 'contact', type: 'add' },
      };

      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserServiceActivationChangeJob',
        properties,
        uuid: 'activation-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.shortName).toBe('UserServiceActivationChangeJob');
      expect(parsed.properties).toEqual(properties);
    });

    it('UTF-8 values survive roundtrip', () => {
      const properties = {
        name: 'Nguyen Văn A',
        company: '（株）タケウチ建設',
      };

      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\CompanyJob',
        properties,
        uuid: 'utf8-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties).toEqual(properties);
    });

    it('null and boolean values', () => {
      const properties = { token: null, active: false, count: 0 };
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\TestJob',
        properties,
        uuid: 'nullbool-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties).toEqual(properties);
    });

    it('Buffer roundtrip (consumer receives Buffer)', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: { key: 'value' },
        uuid: 'buf-uuid',
      });

      const parsed = parseLaravelQueueMessage(Buffer.from(msg));
      expect(parsed.properties).toEqual({ key: 'value' });
    });
  });

  // ── Visibility support ──

  describe('visibility', () => {
    it('private property roundtrip (matches real UserChangedJob)', () => {
      // UserChangedJob: private $type, public $payload
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties: { type: 'create', payload: { id: 100, name: 'Alice' } },
        visibility: { type: 'private' },
        uuid: 'vis-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties).toEqual({
        type: 'create',
        payload: { id: 100, name: 'Alice' },
      });
    });

    it('protected property roundtrip', () => {
      // RabbitMQ base: protected $payload, protected $accessToken
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\SomeJob',
        properties: { payload: { userId: 1 }, accessToken: 'abc' },
        visibility: 'protected',
        uuid: 'prot-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.properties).toEqual({
        payload: { userId: 1 },
        accessToken: 'abc',
      });
    });

    it('command string contains visibility prefixes', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\UserChangedJob',
        properties: { type: 'create' },
        visibility: { type: 'private' },
        uuid: 'check-uuid',
      });

      const envelope = JSON.parse(msg);
      expect(envelope.data.command).toContain('\0App\\Jobs\\UserChangedJob\0type');
    });

    it('real UserChangedJob: private $type + public $payload', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App/Jobs/UserChangedJob',
        properties: {
          type: 'create',
          payload: {
            id: 100,
            name: 'Nguyen Van A',
            username: 'nguyenvana',
            email: 'nguyenvana@example.com',
            isActive: true,
            avatar: 'https://example.com/avatar.jpg',
            phone: '0901234567',
            signature: 'Best regards',
            department: 'Engineering',
          },
        },
        visibility: { type: 'private' },
        uuid: 'real-ucj-uuid',
      });

      const envelope = JSON.parse(msg);
      // private $type → null-byte prefix in command
      expect(envelope.data.command).toContain('\0App\\Jobs\\UserChangedJob\0type');
      // public $payload → no prefix
      expect(envelope.data.command).toContain('s:7:"payload"');

      // Roundtrip: parse back
      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.shortName).toBe('UserChangedJob');
      expect(parsed.properties.type).toBe('create');
      expect(parsed.properties.payload.id).toBe(100);
      expect(parsed.properties.payload.name).toBe('Nguyen Van A');
    });

    it('real UserServiceActivationChangeJob: protected $payload', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App/Jobs/UserServiceActivationChangeJob',
        properties: {
          payload: { userId: 100, serviceCode: 'contact', type: 'add' },
        },
        visibility: { payload: 'protected' },
        uuid: 'real-usacj-uuid',
      });

      const envelope = JSON.parse(msg);
      // protected $payload → \0*\0 prefix
      expect(envelope.data.command).toContain('\0*\0payload');

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.shortName).toBe('UserServiceActivationChangeJob');
      expect(parsed.properties.payload).toEqual({
        userId: 100,
        serviceCode: 'contact',
        type: 'add',
      });
    });
  });

  // ── Forward slash namespace ──

  describe('forward slash namespace', () => {
    it('converts / to \\ in jobName', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App/Jobs/UserChangedJob',
        properties: { type: 'create' },
        uuid: 'slash-uuid',
      });

      const envelope = JSON.parse(msg);
      expect(envelope.data.commandName).toBe('App\\Jobs\\UserChangedJob');
    });

    it('roundtrip with forward slash input', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App/Jobs/UserChangedJob',
        properties: { type: 'create', payload: { id: 1 } },
        uuid: 'slash-rt-uuid',
      });

      const parsed = parseLaravelQueueMessage(msg);
      expect(parsed.jobName).toBe('App\\Jobs\\UserChangedJob');
      expect(parsed.shortName).toBe('UserChangedJob');
      expect(parsed.properties).toEqual({ type: 'create', payload: { id: 1 } });
    });

    it('visibility with forward slash class name', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App/Jobs/UserChangedJob',
        properties: { type: 'create' },
        visibility: { type: 'private' },
        uuid: 'slash-vis-uuid',
      });

      const envelope = JSON.parse(msg);
      expect(envelope.data.command).toContain('\0App\\Jobs\\UserChangedJob\0type');
    });

    it('backslash input still works', () => {
      const msg = createLaravelQueueMessage({
        jobName: 'App\\Jobs\\MyJob',
        properties: { x: 1 },
        uuid: 'bs-uuid',
      });

      const envelope = JSON.parse(msg);
      expect(envelope.data.commandName).toBe('App\\Jobs\\MyJob');
    });
  });
});
