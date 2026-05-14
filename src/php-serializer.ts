import type { PhpVisibility, SerializeObjectOptions } from './types';

export function phpSerialize(value: any): string {
  if (value === null || value === undefined) return 'N;';

  switch (typeof value) {
    case 'boolean':
      return `b:${value ? 1 : 0};`;

    case 'number': {
      if (!Number.isFinite(value)) {
        if (value === Infinity) return 'd:INF;';
        if (value === -Infinity) return 'd:-INF;';
        return 'd:NAN;';
      }
      if (Number.isInteger(value)) return `i:${value};`;
      return `d:${value};`;
    }

    case 'string': {
      const byteLen = Buffer.byteLength(value, 'utf8');
      return `s:${byteLen}:"${value}";`;
    }

    case 'object': {
      if (Array.isArray(value)) return serializeIndexedArray(value);
      return serializeAssocArray(value);
    }

    default:
      throw new Error(`phpSerialize: unsupported type "${typeof value}"`);
  }
}

export function phpSerializeObject(
  className: string,
  properties: Record<string, any>,
  options?: SerializeObjectOptions,
): string {
  const entries = filterUndefined(properties);
  const classNameByteLen = Buffer.byteLength(className, 'utf8');
  let pairs = '';
  for (const [key, val] of entries) {
    const encodedKey = encodePropertyKey(key, className, options?.visibility);
    pairs += phpSerialize(encodedKey) + phpSerialize(val);
  }
  return `O:${classNameByteLen}:"${className}":${entries.length}:{${pairs}}`;
}

// ── Internal ──

function encodePropertyKey(
  key: string,
  className: string,
  visibility?: PhpVisibility | Record<string, PhpVisibility>,
): string {
  const vis = resolveVisibility(key, visibility);
  switch (vis) {
    case 'protected':
      return `\0*\0${key}`;
    case 'private':
      return `\0${className}\0${key}`;
    default:
      return key;
  }
}

function resolveVisibility(
  key: string,
  visibility?: PhpVisibility | Record<string, PhpVisibility>,
): PhpVisibility {
  if (!visibility) return 'public';
  if (typeof visibility === 'string') return visibility;
  return visibility[key] ?? 'public';
}

function serializeIndexedArray(arr: any[]): string {
  let pairs = '';
  for (let i = 0; i < arr.length; i++) {
    pairs += `i:${i};${phpSerialize(arr[i])}`;
  }
  return `a:${arr.length}:{${pairs}}`;
}

function serializeAssocArray(obj: Record<string, any>): string {
  const entries = filterUndefined(obj);
  let pairs = '';
  for (const [key, val] of entries) {
    pairs += phpSerialize(key) + phpSerialize(val);
  }
  return `a:${entries.length}:{${pairs}}`;
}

function filterUndefined(obj: Record<string, any>): [string, any][] {
  return Object.entries(obj).filter(([, v]) => v !== undefined);
}
