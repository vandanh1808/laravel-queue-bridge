import {
  phpSerialize,
  phpSerializeObject,
  phpUnserialize,
} from '../src';

describe('phpSerialize', () => {
  // ═══════════════════════════════════════════
  // Null / undefined
  // ═══════════════════════════════════════════

  describe('null / undefined', () => {
    it('null', () => {
      expect(phpSerialize(null)).toBe('N;');
    });

    it('undefined', () => {
      expect(phpSerialize(undefined)).toBe('N;');
    });
  });

  // ═══════════════════════════════════════════
  // Boolean
  // ═══════════════════════════════════════════

  describe('boolean', () => {
    it('true', () => {
      expect(phpSerialize(true)).toBe('b:1;');
    });

    it('false', () => {
      expect(phpSerialize(false)).toBe('b:0;');
    });
  });

  // ═══════════════════════════════════════════
  // Integer
  // ═══════════════════════════════════════════

  describe('integer', () => {
    it('positive', () => {
      expect(phpSerialize(42)).toBe('i:42;');
    });

    it('zero', () => {
      expect(phpSerialize(0)).toBe('i:0;');
    });

    it('negative', () => {
      expect(phpSerialize(-7)).toBe('i:-7;');
    });

    it('large positive', () => {
      expect(phpSerialize(2147483647)).toBe('i:2147483647;');
    });

    it('large negative', () => {
      expect(phpSerialize(-2147483648)).toBe('i:-2147483648;');
    });
  });

  // ═══════════════════════════════════════════
  // Double
  // ═══════════════════════════════════════════

  describe('double', () => {
    it('positive float', () => {
      expect(phpSerialize(3.14)).toBe('d:3.14;');
    });

    it('negative float', () => {
      expect(phpSerialize(-0.5)).toBe('d:-0.5;');
    });

    it('INF', () => {
      expect(phpSerialize(Infinity)).toBe('d:INF;');
    });

    it('-INF', () => {
      expect(phpSerialize(-Infinity)).toBe('d:-INF;');
    });

    it('NaN', () => {
      expect(phpSerialize(NaN)).toBe('d:NAN;');
    });

    it('large whole number from scientific notation serializes as integer', () => {
      // 1.5e10 = 15000000000, which is a whole number → i:
      expect(phpSerialize(1.5e10)).toBe('i:15000000000;');
    });

    it('very small float', () => {
      const result = phpSerialize(0.000001);
      expect(result).toBe('d:0.000001;');
    });
  });

  // ═══════════════════════════════════════════
  // String
  // ═══════════════════════════════════════════

  describe('string', () => {
    it('basic ASCII', () => {
      expect(phpSerialize('hello')).toBe('s:5:"hello";');
    });

    it('empty string', () => {
      expect(phpSerialize('')).toBe('s:0:"";');
    });

    it('string with spaces', () => {
      expect(phpSerialize('hello world')).toBe('s:11:"hello world";');
    });

    it('string with special characters', () => {
      expect(phpSerialize('a:1;b:2')).toBe('s:7:"a:1;b:2";');
    });

    it('string with double quotes', () => {
      expect(phpSerialize('say "hi"')).toBe('s:8:"say "hi"";');
    });

    it('UTF-8 Japanese (3 bytes each)', () => {
      // 東京 = 2 chars, 6 bytes
      expect(phpSerialize('東京')).toBe('s:6:"東京";');
    });

    it('UTF-8 emoji (4 bytes)', () => {
      // 🎉 = 4 bytes
      expect(phpSerialize('🎉')).toBe('s:4:"🎉";');
    });

    it('mixed ASCII and multibyte', () => {
      // "Hello 世界" = 6 ASCII (6 bytes) + 2 CJK (6 bytes) = 12 bytes
      expect(phpSerialize('Hello 世界')).toBe('s:12:"Hello 世界";');
    });

    it('Vietnamese accented chars (2 bytes each)', () => {
      // "Xin chào" — "à" is 2 bytes, rest is ASCII
      expect(phpSerialize('Xin chào')).toBe('s:9:"Xin chào";');
    });
  });

  // ═══════════════════════════════════════════
  // Array (JS Array → PHP indexed array)
  // ═══════════════════════════════════════════

  describe('array', () => {
    it('empty array', () => {
      expect(phpSerialize([])).toBe('a:0:{}');
    });

    it('array of integers', () => {
      expect(phpSerialize([10, 20, 30])).toBe(
        'a:3:{i:0;i:10;i:1;i:20;i:2;i:30;}',
      );
    });

    it('array of strings', () => {
      expect(phpSerialize(['a', 'b'])).toBe(
        'a:2:{i:0;s:1:"a";i:1;s:1:"b";}',
      );
    });

    it('array of mixed types', () => {
      expect(phpSerialize([1, 'two', true, null])).toBe(
        'a:4:{i:0;i:1;i:1;s:3:"two";i:2;b:1;i:3;N;}',
      );
    });

    it('nested arrays', () => {
      expect(phpSerialize([[1, 2], [3]])).toBe(
        'a:2:{i:0;a:2:{i:0;i:1;i:1;i:2;}i:1;a:1:{i:0;i:3;}}',
      );
    });
  });

  // ═══════════════════════════════════════════
  // Object (JS object → PHP associative array)
  // ═══════════════════════════════════════════

  describe('object', () => {
    it('empty object', () => {
      expect(phpSerialize({})).toBe('a:0:{}');
    });

    it('simple key-value', () => {
      expect(phpSerialize({ id: 1 })).toBe('a:1:{s:2:"id";i:1;}');
    });

    it('multiple properties', () => {
      expect(phpSerialize({ name: 'test', age: 25 })).toBe(
        'a:2:{s:4:"name";s:4:"test";s:3:"age";i:25;}',
      );
    });

    it('nested objects', () => {
      const input = { user: { id: 1, name: 'Alice' } };
      expect(phpSerialize(input)).toBe(
        'a:1:{s:4:"user";a:2:{s:2:"id";i:1;s:4:"name";s:5:"Alice";}}',
      );
    });

    it('object with array property', () => {
      const input = { tags: ['php', 'js'] };
      expect(phpSerialize(input)).toBe(
        'a:1:{s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:2:"js";}}',
      );
    });

    it('skips undefined values', () => {
      const input = { a: 1, b: undefined, c: 3 };
      expect(phpSerialize(input)).toBe(
        'a:2:{s:1:"a";i:1;s:1:"c";i:3;}',
      );
    });

    it('keeps null values', () => {
      const input = { a: 1, b: null };
      expect(phpSerialize(input)).toBe(
        'a:2:{s:1:"a";i:1;s:1:"b";N;}',
      );
    });
  });

  // ═══════════════════════════════════════════
  // Unsupported types
  // ═══════════════════════════════════════════

  describe('unsupported types', () => {
    it('throws on function', () => {
      expect(() => phpSerialize(() => {})).toThrow('unsupported type');
    });

    it('throws on symbol', () => {
      expect(() => phpSerialize(Symbol('x'))).toThrow('unsupported type');
    });

    it('throws on bigint', () => {
      expect(() => phpSerialize(BigInt(42))).toThrow('unsupported type');
    });
  });
});

// ═══════════════════════════════════════════════
// phpSerializeObject
// ═══════════════════════════════════════════════

describe('phpSerializeObject', () => {
  it('stdClass with one property', () => {
    expect(phpSerializeObject('stdClass', { foo: 'bar' })).toBe(
      'O:8:"stdClass":1:{s:3:"foo";s:3:"bar";}',
    );
  });

  it('empty object', () => {
    expect(phpSerializeObject('stdClass', {})).toBe(
      'O:8:"stdClass":0:{}',
    );
  });

  it('namespaced class', () => {
    const result = phpSerializeObject('App\\Jobs\\UserChangedJob', {
      type: 'create',
    });
    expect(result).toBe(
      'O:23:"App\\Jobs\\UserChangedJob":1:{s:4:"type";s:6:"create";}',
    );
  });

  it('multiple properties', () => {
    const result = phpSerializeObject('stdClass', {
      id: 1,
      name: 'test',
      active: true,
    });
    expect(result).toBe(
      'O:8:"stdClass":3:{s:2:"id";i:1;s:4:"name";s:4:"test";s:6:"active";b:1;}',
    );
  });

  it('nested array property', () => {
    const result = phpSerializeObject('App\\Jobs\\UserChangedJob', {
      type: 'create',
      payload: { id: 100, name: 'Alice' },
    });
    expect(result).toBe(
      'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"create";' +
        's:7:"payload";a:2:{s:2:"id";i:100;s:4:"name";s:5:"Alice";}' +
        '}',
    );
  });

  it('skips undefined values', () => {
    const result = phpSerializeObject('stdClass', {
      a: 1,
      b: undefined,
    });
    expect(result).toBe('O:8:"stdClass":1:{s:1:"a";i:1;}');
  });

  // ── Visibility ──

  describe('visibility', () => {
    it('protected property — all properties', () => {
      const result = phpSerializeObject('stdClass', { name: 'test' }, {
        visibility: 'protected',
      });
      // \0*\0name = 7 bytes
      expect(result).toBe('O:8:"stdClass":1:{s:7:"\0*\0name";s:4:"test";}');
    });

    it('private property — all properties', () => {
      const result = phpSerializeObject('stdClass', { name: 'test' }, {
        visibility: 'private',
      });
      // \0stdClass\0name = 1+8+1+4 = 14 bytes
      expect(result).toBe(
        'O:8:"stdClass":1:{s:14:"\0stdClass\0name";s:4:"test";}',
      );
    });

    it('per-property visibility', () => {
      // Matches UserChangedJob: private $type, public $payload
      const result = phpSerializeObject(
        'App\\Jobs\\UserChangedJob',
        { type: 'create', payload: { id: 1 } },
        { visibility: { type: 'private' } },
      );
      // \0App\Jobs\UserChangedJob\0type = 1+23+1+4 = 29 bytes
      expect(result).toBe(
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:29:"\0App\\Jobs\\UserChangedJob\0type";s:6:"create";' +
        's:7:"payload";a:1:{s:2:"id";i:1;}' +
        '}',
      );
    });

    it('mixed public, protected, and private', () => {
      const result = phpSerializeObject(
        'App\\MyClass',
        { pub: 1, prot: 2, priv: 3 },
        { visibility: { prot: 'protected', priv: 'private' } },
      );
      // App\MyClass = 11 chars, \0App\MyClass\0priv = 1+11+1+4 = 17 bytes
      expect(result).toBe(
        'O:11:"App\\MyClass":3:{' +
        's:3:"pub";i:1;' +
        's:7:"\0*\0prot";i:2;' +
        's:17:"\0App\\MyClass\0priv";i:3;' +
        '}',
      );
    });

    it('public is default when visibility map omits a key', () => {
      const result = phpSerializeObject(
        'stdClass',
        { a: 1, b: 2 },
        { visibility: { a: 'protected' } },
      );
      // \0*\0a = 4 bytes
      expect(result).toBe(
        'O:8:"stdClass":2:{s:4:"\0*\0a";i:1;s:1:"b";i:2;}',
      );
    });

    it('visibility roundtrip — unserialize strips prefixes', () => {
      const serialized = phpSerializeObject(
        'App\\Jobs\\UserChangedJob',
        { type: 'create', payload: { id: 100 } },
        { visibility: { type: 'private' } },
      );
      // phpUnserialize strips visibility prefixes → clean property names
      expect(phpUnserialize(serialized)).toEqual({
        type: 'create',
        payload: { id: 100 },
      });
    });
  });
});

// ═══════════════════════════════════════════════
// Roundtrip: serialize → unserialize
// ═══════════════════════════════════════════════

describe('roundtrip: phpSerialize → phpUnserialize', () => {
  it.each([
    ['null', null],
    ['boolean true', true],
    ['boolean false', false],
    ['integer', 42],
    ['negative integer', -7],
    ['zero', 0],
    ['float', 3.14],
    ['string', 'hello'],
    ['empty string', ''],
    ['UTF-8 string', 'Hello 世界'],
  ])('%s', (_label, value) => {
    expect(phpUnserialize(phpSerialize(value))).toEqual(value);
  });

  it('INF roundtrip', () => {
    expect(phpUnserialize(phpSerialize(Infinity))).toBe(Infinity);
  });

  it('-INF roundtrip', () => {
    expect(phpUnserialize(phpSerialize(-Infinity))).toBe(-Infinity);
  });

  it('NaN roundtrip', () => {
    expect(phpUnserialize(phpSerialize(NaN))).toBeNaN();
  });

  it('plain object roundtrip', () => {
    const obj = { id: 1, name: 'Alice', active: true, token: null };
    expect(phpUnserialize(phpSerialize(obj))).toEqual(obj);
  });

  it('nested object roundtrip', () => {
    const obj = {
      user: { id: 1, name: 'test' },
      meta: { tags: { '0': 'a', '1': 'b' } },
    };
    expect(phpUnserialize(phpSerialize(obj))).toEqual(obj);
  });

  it('phpSerializeObject roundtrip', () => {
    const props = { type: 'create', payload: { id: 100, name: 'Alice' } };
    const serialized = phpSerializeObject('App\\Jobs\\UserChangedJob', props);
    expect(phpUnserialize(serialized)).toEqual(props);
  });
});
