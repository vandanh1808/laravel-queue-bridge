import { phpUnserialize, PhpUnserializeError } from '../src';

describe('phpUnserialize', () => {
  // ═══════════════════════════════════════════
  // String (s)
  // ═══════════════════════════════════════════

  describe('string', () => {
    it('basic string', () => {
      expect(phpUnserialize('s:5:"hello";')).toBe('hello');
    });

    it('empty string', () => {
      expect(phpUnserialize('s:0:"";')).toBe('');
    });

    it('single character', () => {
      expect(phpUnserialize('s:1:"a";')).toBe('a');
    });

    it('string with spaces', () => {
      expect(phpUnserialize('s:11:"hello world";')).toBe('hello world');
    });

    it('string containing double quotes', () => {
      expect(phpUnserialize('s:13:"hello "world"";')).toBe('hello "world"');
    });

    it('string containing single quotes', () => {
      expect(phpUnserialize('s:4:"it\'s";')).toBe("it's");
    });

    it('string containing backslashes', () => {
      expect(phpUnserialize('s:10:"path\\to\\it";')).toBe('path\\to\\it');
    });

    it('string containing colons and semicolons', () => {
      expect(phpUnserialize('s:7:"a:1;b:2";')).toBe('a:1;b:2');
    });

    it('string containing curly braces', () => {
      expect(phpUnserialize('s:5:"{foo}";')).toBe('{foo}');
    });

    it('string with newlines', () => {
      expect(phpUnserialize('s:11:"line1\nline2";')).toBe('line1\nline2');
    });

    it('string with tabs', () => {
      expect(phpUnserialize('s:5:"a\tb\tc";')).toBe('a\tb\tc');
    });

    it('string that looks like serialized data', () => {
      // The content happens to look like PHP serialize format
      expect(phpUnserialize('s:11:"s:3:"inner"";')).toBe('s:3:"inner"');
    });

    it('URL string', () => {
      expect(phpUnserialize('s:30:"https://example.com/avatar.jpg";')).toBe(
        'https://example.com/avatar.jpg',
      );
    });

    it('email string', () => {
      expect(phpUnserialize('s:16:"user@example.com";')).toBe(
        'user@example.com',
      );
    });

    it('JSON-like string', () => {
      expect(phpUnserialize('s:13:"{"key":"val"}";')).toBe('{"key":"val"}');
    });

    it('string with only special characters', () => {
      expect(phpUnserialize('s:5:"!@#$%";')).toBe('!@#$%');
    });

    // ── UTF-8 multi-byte ──

    it('UTF-8 Japanese characters (3 bytes each)', () => {
      // 9 chars × 3 bytes = 27
      expect(phpUnserialize('s:27:"（株）タケウチ建設";')).toBe(
        '（株）タケウチ建設',
      );
    });

    it('UTF-8 Chinese characters', () => {
      // 你好 = 2 chars × 3 bytes = 6
      expect(phpUnserialize('s:6:"你好";')).toBe('你好');
    });

    it('UTF-8 Korean characters', () => {
      // 한국어 = 3 chars × 3 bytes = 9
      expect(phpUnserialize('s:9:"한국어";')).toBe('한국어');
    });

    it('UTF-8 Vietnamese (2-byte accented chars)', () => {
      // "Xin chào" = X(1)i(1)n(1) (1)c(1)h(1)à(2)o(1) = 9 bytes
      expect(phpUnserialize('s:9:"Xin chào";')).toBe('Xin chào');
    });

    it('UTF-8 emoji (4 bytes)', () => {
      // 🎉 = U+1F389 = 4 bytes UTF-8
      expect(phpUnserialize('s:4:"🎉";')).toBe('🎉');
    });

    it('multiple emojis', () => {
      // 🎉🚀 = 4 + 4 = 8 bytes
      expect(phpUnserialize('s:8:"🎉🚀";')).toBe('🎉🚀');
    });

    it('mixed ASCII and multibyte', () => {
      // "Hello 世界" = 6 ASCII(6) + 2 CJK(6) = 12 bytes
      expect(phpUnserialize('s:12:"Hello 世界";')).toBe('Hello 世界');
    });

    it('string with null bytes (PHP internal)', () => {
      // Null byte is valid in PHP strings, 1 byte in UTF-8
      const input = 's:5:"a\0b\0c";';
      expect(phpUnserialize(input)).toBe('a\0b\0c');
    });
  });

  // ═══════════════════════════════════════════
  // Integer (i)
  // ═══════════════════════════════════════════

  describe('integer', () => {
    it('positive integer', () => {
      expect(phpUnserialize('i:42;')).toBe(42);
    });

    it('zero', () => {
      expect(phpUnserialize('i:0;')).toBe(0);
    });

    it('negative integer', () => {
      expect(phpUnserialize('i:-7;')).toBe(-7);
    });

    it('single digit', () => {
      expect(phpUnserialize('i:1;')).toBe(1);
    });

    it('large positive (PHP_INT_MAX on 32-bit)', () => {
      expect(phpUnserialize('i:2147483647;')).toBe(2147483647);
    });

    it('large negative (PHP_INT_MIN on 32-bit)', () => {
      expect(phpUnserialize('i:-2147483648;')).toBe(-2147483648);
    });

    it('large positive (beyond 32-bit)', () => {
      expect(phpUnserialize('i:9999999999;')).toBe(9999999999);
    });
  });

  // ═══════════════════════════════════════════
  // Double (d)
  // ═══════════════════════════════════════════

  describe('double', () => {
    it('positive float', () => {
      expect(phpUnserialize('d:3.14;')).toBeCloseTo(3.14);
    });

    it('negative float', () => {
      expect(phpUnserialize('d:-2.5;')).toBeCloseTo(-2.5);
    });

    it('zero as double', () => {
      expect(phpUnserialize('d:0;')).toBe(0);
    });

    it('integer value as double', () => {
      expect(phpUnserialize('d:42;')).toBe(42);
    });

    it('very small float', () => {
      expect(phpUnserialize('d:0.001;')).toBeCloseTo(0.001);
    });

    it('large float', () => {
      expect(phpUnserialize('d:99999.99;')).toBeCloseTo(99999.99);
    });

    it('scientific notation', () => {
      expect(phpUnserialize('d:1.0E+10;')).toBe(1e10);
    });

    it('negative scientific notation', () => {
      expect(phpUnserialize('d:-5.5E-3;')).toBeCloseTo(-0.0055);
    });

    it('INF', () => {
      expect(phpUnserialize('d:INF;')).toBe(Infinity);
    });

    it('-INF', () => {
      expect(phpUnserialize('d:-INF;')).toBe(-Infinity);
    });

    it('NAN', () => {
      expect(phpUnserialize('d:NAN;')).toBeNaN();
    });
  });

  // ═══════════════════════════════════════════
  // Boolean (b)
  // ═══════════════════════════════════════════

  describe('boolean', () => {
    it('true', () => {
      expect(phpUnserialize('b:1;')).toBe(true);
    });

    it('false', () => {
      expect(phpUnserialize('b:0;')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // Null (N)
  // ═══════════════════════════════════════════

  describe('null', () => {
    it('null value', () => {
      expect(phpUnserialize('N;')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════
  // Array (a)
  // ═══════════════════════════════════════════

  describe('array', () => {
    it('empty array', () => {
      expect(phpUnserialize('a:0:{}')).toEqual({});
    });

    it('single key-value pair', () => {
      expect(phpUnserialize('a:1:{s:2:"id";i:1;}')).toEqual({ id: 1 });
    });

    it('associative array with string values', () => {
      expect(
        phpUnserialize('a:2:{s:2:"id";i:1;s:4:"name";s:5:"hello";}'),
      ).toEqual({ id: 1, name: 'hello' });
    });

    it('numeric-keyed array (PHP indexed array)', () => {
      expect(
        phpUnserialize('a:3:{i:0;s:3:"foo";i:1;s:3:"bar";i:2;s:3:"baz";}'),
      ).toEqual({ '0': 'foo', '1': 'bar', '2': 'baz' });
    });

    it('mixed key types (string and integer)', () => {
      expect(
        phpUnserialize('a:2:{i:0;s:5:"first";s:3:"key";s:5:"value";}'),
      ).toEqual({ '0': 'first', key: 'value' });
    });

    it('all value types in one array', () => {
      const input =
        'a:6:{' +
        's:3:"str";s:5:"hello";' +
        's:3:"int";i:42;' +
        's:3:"dbl";d:3.14;' +
        's:4:"bool";b:1;' +
        's:4:"null";N;' +
        's:3:"arr";a:1:{s:1:"x";i:1;}' +
        '}';
      expect(phpUnserialize(input)).toEqual({
        str: 'hello',
        int: 42,
        dbl: 3.14,
        bool: true,
        null: null,
        arr: { x: 1 },
      });
    });

    it('nested array (2 levels)', () => {
      const input =
        'a:1:{s:7:"address";a:2:{s:4:"city";s:5:"Tokyo";s:3:"zip";s:7:"100-001";}}';
      expect(phpUnserialize(input)).toEqual({
        address: { city: 'Tokyo', zip: '100-001' },
      });
    });

    it('deeply nested array (3 levels)', () => {
      const input =
        'a:1:{s:1:"a";a:1:{s:1:"b";a:1:{s:1:"c";s:4:"deep";}}}';
      expect(phpUnserialize(input)).toEqual({
        a: { b: { c: 'deep' } },
      });
    });

    it('array containing object', () => {
      const input =
        'a:1:{s:4:"user";O:8:"stdClass":2:{s:2:"id";i:1;s:4:"name";s:4:"test";}}';
      expect(phpUnserialize(input)).toEqual({
        user: { id: 1, name: 'test' },
      });
    });

    it('duplicate keys — last value wins', () => {
      const input = 'a:2:{s:3:"key";s:5:"first";s:3:"key";s:4:"last";}';
      expect(phpUnserialize(input)).toEqual({ key: 'last' });
    });

    it('large array (10 elements)', () => {
      let pairs = '';
      for (let i = 0; i < 10; i++) {
        pairs += `i:${i};i:${i * 10};`;
      }
      const result = phpUnserialize(`a:10:{${pairs}}`);
      expect(Object.keys(result)).toHaveLength(10);
      expect(result['0']).toBe(0);
      expect(result['9']).toBe(90);
    });
  });

  // ═══════════════════════════════════════════
  // Object (O)
  // ═══════════════════════════════════════════

  describe('object', () => {
    it('stdClass with one property', () => {
      expect(
        phpUnserialize('O:8:"stdClass":1:{s:3:"foo";s:3:"bar";}'),
      ).toEqual({ foo: 'bar' });
    });

    it('empty object (no properties)', () => {
      expect(phpUnserialize('O:8:"stdClass":0:{}')).toEqual({});
    });

    it('object with multiple properties', () => {
      const input =
        'O:8:"stdClass":3:{s:2:"id";i:1;s:4:"name";s:4:"test";s:6:"active";b:1;}';
      expect(phpUnserialize(input)).toEqual({
        id: 1,
        name: 'test',
        active: true,
      });
    });

    it('namespaced class (class name discarded)', () => {
      const input =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"create";' +
        's:7:"payload";a:2:{s:2:"id";i:1;s:4:"name";s:4:"test";}}';
      expect(phpUnserialize(input)).toEqual({
        type: 'create',
        payload: { id: 1, name: 'test' },
      });
    });

    it('deeply namespaced class', () => {
      // App\Infrastructure\Events\UserActiveChanged = 43 chars
      const input =
        'O:43:"App\\Infrastructure\\Events\\UserActiveChanged":1:{s:3:"foo";s:3:"bar";}';
      expect(phpUnserialize(input)).toEqual({ foo: 'bar' });
    });

    it('nested objects', () => {
      const input =
        'O:8:"stdClass":1:{' +
        's:5:"inner";O:8:"stdClass":1:{s:3:"key";s:5:"value";}}';
      expect(phpUnserialize(input)).toEqual({
        inner: { key: 'value' },
      });
    });

    it('object with array property', () => {
      const input =
        'O:8:"stdClass":1:{s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:2:"js";}}';
      expect(phpUnserialize(input)).toEqual({
        tags: { '0': 'php', '1': 'js' },
      });
    });

    it('object with null property', () => {
      const input = 'O:8:"stdClass":2:{s:4:"name";s:4:"test";s:5:"token";N;}';
      expect(phpUnserialize(input)).toEqual({ name: 'test', token: null });
    });

    it('object with boolean false property', () => {
      const input = 'O:8:"stdClass":1:{s:6:"active";b:0;}';
      expect(phpUnserialize(input)).toEqual({ active: false });
    });

    it('deeply nested objects (3 levels)', () => {
      // O:stdClass { level1: O:stdClass { level2: O:stdClass { value: "deep" } } }
      const input =
        'O:8:"stdClass":1:{s:6:"level1";O:8:"stdClass":1:{s:6:"level2";O:8:"stdClass":1:{s:5:"value";s:4:"deep";}}}';
      expect(phpUnserialize(input)).toEqual({
        level1: { level2: { value: 'deep' } },
      });
    });

    it('object → array → object nesting', () => {
      // O:Order { items: a:[ O:Item{name:"book"}, O:Item{name:"pen"} ] }
      const input =
        'O:5:"Order":1:{s:5:"items";a:2:{' +
        'i:0;O:4:"Item":1:{s:4:"name";s:4:"book";}' +
        'i:1;O:4:"Item":1:{s:4:"name";s:3:"pen";}' +
        '}}';
      expect(phpUnserialize(input)).toEqual({
        items: {
          '0': { name: 'book' },
          '1': { name: 'pen' },
        },
      });
    });

    it('object with mixed nested types', () => {
      // Object with: string, int, bool, null, nested array, nested object
      const input =
        'O:8:"stdClass":6:{' +
        's:4:"name";s:4:"test";' +
        's:3:"age";i:25;' +
        's:6:"active";b:1;' +
        's:5:"token";N;' +
        's:4:"meta";a:2:{s:3:"key";s:5:"value";s:5:"count";i:42;}' +
        's:7:"address";O:7:"Address":2:{s:4:"city";s:5:"Tokyo";s:3:"zip";s:7:"100-001";}' +
        '}';
      expect(phpUnserialize(input)).toEqual({
        name: 'test',
        age: 25,
        active: true,
        token: null,
        meta: { key: 'value', count: 42 },
        address: { city: 'Tokyo', zip: '100-001' },
      });
    });

    it('different class names at same nesting level', () => {
      const input =
        'O:8:"stdClass":2:{' +
        's:6:"author";O:6:"Person":1:{s:4:"name";s:5:"Alice";}' +
        's:7:"company";O:7:"Company":1:{s:4:"name";s:4:"Acme";}' +
        '}';
      expect(phpUnserialize(input)).toEqual({
        author: { name: 'Alice' },
        company: { name: 'Acme' },
      });
    });
  });

  // ═══════════════════════════════════════════
  // PHP visibility (private/protected)
  // PHP private:   key = \0ClassName\0propName
  // PHP protected: key = \0*\0propName
  // ═══════════════════════════════════════════

  describe('PHP property visibility', () => {
    it('strips private property prefix (\0ClassName\0prop)', () => {
      // private $bar in class Foo → key is "\0Foo\0bar" (8 bytes)
      const input = 'O:3:"Foo":1:{s:8:"\0Foo\0bar";s:3:"baz";}';
      expect(phpUnserialize(input)).toEqual({ bar: 'baz' });
    });

    it('strips protected property prefix (\0*\0prop)', () => {
      // protected $name → key is "\0*\0name" (7 bytes)
      const input = 'O:3:"Foo":1:{s:7:"\0*\0name";s:4:"test";}';
      expect(phpUnserialize(input)).toEqual({ name: 'test' });
    });

    it('keeps public property name as-is', () => {
      const input = 'O:3:"Foo":1:{s:4:"name";s:4:"test";}';
      expect(phpUnserialize(input)).toEqual({ name: 'test' });
    });

    it('handles mix of public, protected, and private', () => {
      const input =
        'O:3:"Foo":3:{' +
        's:4:"pub1";s:6:"public";' +
        's:7:"\0*\0pro1";s:9:"protected";' +
        's:9:"\0Foo\0pri1";s:7:"private";}';
      expect(phpUnserialize(input)).toEqual({
        pub1: 'public',
        pro1: 'protected',
        pri1: 'private',
      });
    });

    it('strips private with namespaced class', () => {
      // private $type in App\Jobs\UserChangedJob
      // key = "\0App\Jobs\UserChangedJob\0type"
      // \0(1) + App\Jobs\UserChangedJob(23) + \0(1) + type(4) = 29 bytes
      const input =
        'O:23:"App\\Jobs\\UserChangedJob":1:{' +
        's:29:"\0App\\Jobs\\UserChangedJob\0type";s:6:"create";}';
      expect(phpUnserialize(input)).toEqual({ type: 'create' });
    });

    it('private property in array context also stripped', () => {
      const input = 'a:1:{s:8:"\0Foo\0bar";s:3:"baz";}';
      expect(phpUnserialize(input)).toEqual({ bar: 'baz' });
    });
  });

  // ═══════════════════════════════════════════
  // Real-world: tContact payloads
  // ═══════════════════════════════════════════

  describe('real-world tContact payloads', () => {
    it('UserChangedJob create (full payload)', () => {
      const input =
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

      const result = phpUnserialize(input);
      expect(result.type).toBe('create');
      expect(result.payload).toEqual({
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

    it('UserChangedJob update', () => {
      const input =
        'O:23:"App\\Jobs\\UserChangedJob":2:{' +
        's:4:"type";s:6:"update";' +
        's:7:"payload";a:9:{' +
        's:2:"id";i:100;' +
        's:4:"name";s:22:"Nguyen Van A (Updated)";' +
        's:8:"username";s:10:"nguyenvana";' +
        's:5:"email";s:30:"nguyenvana.updated@example.com";' +
        's:8:"isActive";b:0;' +
        's:6:"avatar";N;' +
        's:5:"phone";s:10:"0907654321";' +
        's:9:"signature";s:0:"";' +
        's:10:"department";s:7:"Product";' +
        '}}';

      const result = phpUnserialize(input);
      expect(result.type).toBe('update');
      expect(result.payload.isActive).toBe(false);
      expect(result.payload.avatar).toBeNull();
      expect(result.payload.signature).toBe('');
    });

    it('UserChangedJob delete (payload is integer)', () => {
      const input =
        'O:23:"App\\Jobs\\UserChangedJob":2:{s:4:"type";s:6:"delete";s:7:"payload";i:100;}';
      expect(phpUnserialize(input)).toEqual({ type: 'delete', payload: 100 });
    });

    it('UserServiceActivationChangeJob', () => {
      const input =
        'O:39:"App\\Jobs\\UserServiceActivationChangeJob":1:{' +
        's:7:"payload";a:3:{' +
        's:6:"userId";i:100;' +
        's:11:"serviceCode";s:7:"contact";' +
        's:4:"type";s:3:"add";' +
        '}}';
      expect(phpUnserialize(input).payload).toEqual({
        userId: 100,
        serviceCode: 'contact',
        type: 'add',
      });
    });

    it('CompanyChangedJob (nested address)', () => {
      const input =
        'O:8:"stdClass":2:{' +
        's:6:"action";s:6:"create";' +
        's:7:"payload";a:4:{' +
        's:2:"id";i:500;' +
        's:4:"code";s:6:"C-0500";' +
        's:4:"name";s:15:"Test Company Co";' +
        's:7:"address";a:3:{' +
        's:7:"country";s:2:"JP";' +
        's:7:"zipcode";s:8:"100-0001";' +
        's:4:"city";s:5:"Tokyo";' +
        '}}}';
      const result = phpUnserialize(input);
      expect(result.payload.address).toEqual({
        country: 'JP',
        zipcode: '100-0001',
        city: 'Tokyo',
      });
    });

    it('payload with Japanese organization name', () => {
      // "（株）タケウチ建設" = 27 bytes UTF-8
      const input =
        'a:2:{s:2:"id";i:1;s:12:"organization";s:27:"（株）タケウチ建設";}';
      expect(phpUnserialize(input)).toEqual({
        id: 1,
        organization: '（株）タケウチ建設',
      });
    });
  });

  // ═══════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════

  describe('error handling', () => {
    it('throws on unknown type', () => {
      expect(() => phpUnserialize('x:1;')).toThrow(PhpUnserializeError);
      expect(() => phpUnserialize('x:1;')).toThrow('Unknown type "x"');
    });

    it('throws on unexpected character in string format', () => {
      expect(() => phpUnserialize('s:3:hello;')).toThrow("Expected '\"'");
    });

    it('throws on truncated string value', () => {
      expect(() => phpUnserialize('s:10:"short";')).toThrow(
        PhpUnserializeError,
      );
    });

    it('throws on missing semicolon after integer', () => {
      expect(() => phpUnserialize('i:42')).toThrow(PhpUnserializeError);
    });

    it('throws on empty input', () => {
      expect(() => phpUnserialize('')).toThrow(PhpUnserializeError);
    });

    it('throws on missing closing brace in array', () => {
      expect(() => phpUnserialize('a:1:{s:3:"key";i:1;')).toThrow(
        PhpUnserializeError,
      );
    });

    it('throws on missing closing brace in object', () => {
      expect(() =>
        phpUnserialize('O:8:"stdClass":1:{s:3:"foo";s:3:"bar";'),
      ).toThrow(PhpUnserializeError);
    });

    it('throws on invalid value inside array', () => {
      expect(() =>
        phpUnserialize('a:1:{s:3:"key";x:1;}'),
      ).toThrow(PhpUnserializeError);
    });

    it('throws on non-numeric string length', () => {
      expect(() => phpUnserialize('s:abc:"test";')).toThrow(
        PhpUnserializeError,
      );
    });

    it('throws on non-numeric array count', () => {
      expect(() => phpUnserialize('a:abc:{}')).toThrow(PhpUnserializeError);
    });

    it('error is instanceof PhpUnserializeError', () => {
      try {
        phpUnserialize('x:1;');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PhpUnserializeError);
        expect(err).toBeInstanceOf(Error);
      }
    });

    it('error.position is accurate at start', () => {
      try {
        phpUnserialize('x:1;');
        fail('should have thrown');
      } catch (err) {
        expect((err as PhpUnserializeError).position).toBe(0);
      }
    });

    it('error.position is accurate for nested failure', () => {
      try {
        phpUnserialize('a:1:{s:3:"key";x:1;}');
        fail('should have thrown');
      } catch (err) {
        expect((err as PhpUnserializeError).position).toBe(15);
      }
    });

    it('error.source contains original input', () => {
      const input = 'x:bad;';
      try {
        phpUnserialize(input);
        fail('should have thrown');
      } catch (err) {
        expect((err as PhpUnserializeError).source).toBe(input);
      }
    });

    it('error.message contains position', () => {
      try {
        phpUnserialize('x:1;');
        fail('should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('position 0');
      }
    });

    it('error.name is PhpUnserializeError', () => {
      try {
        phpUnserialize('x:1;');
        fail('should have thrown');
      } catch (err) {
        expect((err as PhpUnserializeError).name).toBe('PhpUnserializeError');
      }
    });
  });
});
