# laravel-queue-bridge

Zero-dependency Node.js/TypeScript library for bidirectional Laravel Queue message serialization.

## Project structure

- `src/php-unserializer.ts` — PHP `unserialize()` parser (string → JS value)
- `src/php-serializer.ts` — PHP `serialize()` generator (JS value → string), supports property visibility
- `src/laravel-queue-message.ts` — High-level API: `parseLaravelQueueMessage()` and `createLaravelQueueMessage()`
- `src/types.ts` — All TypeScript interfaces and types
- `src/index.ts` — Public exports
- `tests/` — Jest tests (215 tests)

## Key concepts

- Laravel Queue messages are JSON envelopes wrapping a PHP `serialize()` string in `data.command`
- PHP serialize encodes property visibility via null-byte prefixes: `\0*\0` (protected), `\0ClassName\0` (private)
- The `visibility` option in `createLaravelQueueMessage()` must match the target PHP job class exactly, or properties will be `null` after `unserialize()`
- `jobName` accepts forward slashes (`App/Jobs/MyJob`) — auto-converted to backslashes

## Commands

- `npm test` — run all tests
- `npm run build` — compile TypeScript to `dist/`

## Skills

See `.claude/skills/laravel-queue-bridge.md` for the full API guide with code generation patterns.
