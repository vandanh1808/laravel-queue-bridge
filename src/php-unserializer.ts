export function phpUnserialize(serialized: string): any {
  const reader = new PhpReader(serialized);
  return reader.readValue();
}

// ── Internal ──

class PhpReader {
  private pos = 0;

  constructor(private readonly input: string) {}

  readValue(): any {
    switch (this.peek()) {
      case 's': return this.readString();
      case 'i': return this.readInt();
      case 'd': return this.readDouble();
      case 'b': return this.readBool();
      case 'N': return this.readNull();
      case 'a': return this.readArray();
      case 'O': return this.readObject();
      default:
        throw new PhpUnserializeError(
          `Unknown type "${this.peek()}"`,
          this.pos,
          this.input,
        );
    }
  }

  // s:5:"hello";
  private readString(): string {
    this.expect('s');
    this.expect(':');
    const byteLength = this.readNumberUntil(':');
    this.expect(':');
    this.expect('"');
    const value = this.takeUtf8Bytes(byteLength);
    this.expect('"');
    this.expect(';');
    return value;
  }

  // i:42;
  private readInt(): number {
    this.expect('i');
    this.expect(':');
    const value = this.readNumberUntil(';');
    this.expect(';');
    return value;
  }

  // d:3.14;
  private readDouble(): number {
    this.expect('d');
    this.expect(':');
    const raw = this.readUntil(';');
    this.expect(';');
    if (raw === 'INF') return Infinity;
    if (raw === '-INF') return -Infinity;
    if (raw === 'NAN') return NaN;
    return parseFloat(raw);
  }

  // b:1;
  private readBool(): boolean {
    this.expect('b');
    this.expect(':');
    const value = this.take(1) === '1';
    this.expect(';');
    return value;
  }

  // N;
  private readNull(): null {
    this.expect('N');
    this.expect(';');
    return null;
  }

  // a:2:{s:2:"id";i:1;s:4:"name";s:5:"hello";}
  private readArray(): Record<string, any> {
    this.expect('a');
    this.expect(':');
    const count = this.readNumberUntil(':');
    this.expect(':');
    this.expect('{');
    const result = this.readPairs(count);
    this.expect('}');
    return result;
  }

  // O:8:"stdClass":1:{s:3:"foo";s:3:"bar";}
  private readObject(): Record<string, any> {
    this.expect('O');
    this.expect(':');
    const classNameByteLen = this.readNumberUntil(':');
    this.expect(':');
    this.expect('"');
    this.skipUtf8Bytes(classNameByteLen);
    this.expect('"');
    this.expect(':');
    const propCount = this.readNumberUntil(':');
    this.expect(':');
    this.expect('{');
    const result = this.readPairs(propCount);
    this.expect('}');
    return result;
  }

  private readPairs(count: number): Record<string, any> {
    const result: Record<string, any> = {};
    for (let i = 0; i < count; i++) {
      const rawKey = this.readValue();
      const key = this.stripVisibilityPrefix(String(rawKey));
      result[key] = this.readValue();
    }
    return result;
  }

  private stripVisibilityPrefix(key: string): string {
    if (key.charCodeAt(0) !== 0) return key;
    const lastNull = key.lastIndexOf('\0');
    return key.substring(lastNull + 1);
  }

  // ── Primitives ──

  private peek(): string {
    return this.input[this.pos];
  }

  private take(charCount: number): string {
    const value = this.input.substring(this.pos, this.pos + charCount);
    this.pos += charCount;
    return value;
  }

  private takeUtf8Bytes(byteLength: number): string {
    const chars = this.countUtf8Chars(byteLength);
    const value = this.input.substring(this.pos, this.pos + chars);
    this.pos += chars;
    return value;
  }

  private skipUtf8Bytes(byteLength: number): void {
    this.pos += this.countUtf8Chars(byteLength);
  }

  private countUtf8Chars(byteLength: number): number {
    let bytesRead = 0;
    let chars = 0;
    while (bytesRead < byteLength) {
      const code = this.input.codePointAt(this.pos + chars);
      if (code === undefined) break;
      bytesRead += utf8ByteSize(code);
      if (code > 0xffff) chars++; // surrogate pair takes 2 JS chars
      chars++;
    }
    return chars;
  }

  private expect(char: string): void {
    const actual = this.input[this.pos];
    if (actual !== char) {
      throw new PhpUnserializeError(
        `Expected '${char}' but got '${actual ?? 'EOF'}'`,
        this.pos,
        this.input,
      );
    }
    this.pos++;
  }

  private readUntil(delimiter: string): string {
    const start = this.pos;
    while (this.pos < this.input.length && this.input[this.pos] !== delimiter) {
      this.pos++;
    }
    if (this.pos >= this.input.length) {
      throw new PhpUnserializeError(
        `Unexpected end of input, expected '${delimiter}'`,
        this.pos,
        this.input,
      );
    }
    return this.input.substring(start, this.pos);
  }

  private readNumberUntil(delimiter: string): number {
    const raw = this.readUntil(delimiter);
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      throw new PhpUnserializeError(
        `Expected number but got '${raw}'`,
        this.pos - raw.length,
        this.input,
      );
    }
    return num;
  }
}

function utf8ByteSize(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

export class PhpUnserializeError extends Error {
  constructor(
    message: string,
    public readonly position: number,
    public readonly source: string,
  ) {
    super(`${message} (at position ${position})`);
    this.name = 'PhpUnserializeError';
  }
}
