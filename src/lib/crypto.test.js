import { subtle } from 'crypto';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { generateRandomId, generateUUID, getHash, uuidPattern } from './crypto.js';

describe('Test uuidPattern', () => {
  test('matches valid UUIDs', () => {
    expect(uuidPattern.test('9649bc30-4618-42eb-894e-c6441e7810d6')).toBe(true);
    expect(uuidPattern.test('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  test('does not match invalid strings', () => {
    expect(uuidPattern.test('not-a-uuid')).toBe(false);
    expect(uuidPattern.test('')).toBe(false);
  });
});

describe('Test generateUUID()', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: vi.fn().mockReturnValue('9649bc30-4618-42eb-894e-c6441e7810d6') },
    });
  });

  test('variants', () => {
    expect(generateUUID()).toEqual('9649bc30-4618-42eb-894e-c6441e7810d6');
    expect(generateUUID('short')).toEqual('c6441e7810d6');
    expect(generateUUID('shorter')).toEqual('9649bc30');
    expect(generateUUID(12)).toEqual('9649bc304618');
    expect(generateUUID(20)).toEqual('9649bc30461842eb894e');
  });
});

describe('Test generateRandomId()', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: vi.fn().mockReturnValue('9649bc30-4618-42eb-894e-c6441e7810d6') },
    });
  });

  test('returns 26-character lowercase string', () => {
    const id = generateRandomId();

    expect(typeof id).toBe('string');
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[a-z2-7]{26}$/);
  });
});

describe('Test getHash()', () => {
  // The Web Crypto API is only available in secure contexts; we need to use the `node:crypto`
  // module to pass these tests
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle },
    });
  });

  const string = 'Hello, World!';
  const blob = new Blob([string], { type: 'text/plain' });

  test('SHA-1', async () => {
    const hash = '0a0a9f2a6772942557ab5355d76af442f8f65e01';

    expect(await getHash(string)).toEqual(hash);
    expect(await getHash(blob)).toEqual(hash);
  });

  test('SHA-256', async () => {
    const hash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

    expect(await getHash(string, { algorithm: 'SHA-256' })).toEqual(hash);
    expect(await getHash(blob, { algorithm: 'SHA-256' })).toEqual(hash);
  });

  test('SHA-512', async () => {
    const hash = await getHash(string, { algorithm: 'SHA-512' });

    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(128);
  });

  test('binary format', async () => {
    const result = await getHash(string, { format: 'binary' });

    expect(typeof result).toBe('string');
    // Binary format should be shorter than hex (20 bytes vs 40 hex chars for SHA-1)
    expect(result.length).toBe(20);
  });

  test('File input', async () => {
    const file = new File([string], 'test.txt', { type: 'text/plain' });
    const hash = '0a0a9f2a6772942557ab5355d76af442f8f65e01';

    expect(await getHash(file)).toEqual(hash);
  });

  test('ArrayBuffer input', async () => {
    const uint8Array = new TextEncoder().encode(string);

    const buffer = uint8Array.buffer.slice(
      uint8Array.byteOffset,
      uint8Array.byteOffset + uint8Array.byteLength,
    );

    const hash = '0a0a9f2a6772942557ab5355d76af442f8f65e01';

    expect(await getHash(buffer)).toEqual(hash);
  });

  test('TypedArray input', async () => {
    const uint8Array = new TextEncoder().encode(string);
    const hash = '0a0a9f2a6772942557ab5355d76af442f8f65e01';

    expect(await getHash(uint8Array)).toEqual(hash);
  });

  test('throws on unsupported input', async () => {
    await expect(getHash(/** @type {any} */ (42))).rejects.toThrow(
      'Unsupported input type for getHash',
    );
  });
});

describe('Test generateUUID()', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: vi.fn().mockReturnValue('9649bc30-4618-42eb-894e-c6441e7810d6') },
    });
  });

  test('variants', () => {
    expect(generateUUID()).toEqual('9649bc30-4618-42eb-894e-c6441e7810d6');
    expect(generateUUID('short')).toEqual('c6441e7810d6');
    expect(generateUUID('shorter')).toEqual('9649bc30');
    expect(generateUUID(12)).toEqual('9649bc304618');
    expect(generateUUID(20)).toEqual('9649bc30461842eb894e');
  });
});

describe('Test getHash()', () => {
  // The Web Crypto API is only available in secure contexts; we need to use the `node:crypto`
  // module to pass these tests
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle },
    });
  });

  const string = 'Hello, World!';
  const blob = new Blob([string], { type: 'text/plain' });

  test('SHA-1', async () => {
    const hash = '0a0a9f2a6772942557ab5355d76af442f8f65e01';

    expect(await getHash(string)).toEqual(hash);
    expect(await getHash(blob)).toEqual(hash);
  });

  test('SHA-256', async () => {
    const hash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

    expect(await getHash(string, { algorithm: 'SHA-256' })).toEqual(hash);
    expect(await getHash(blob, { algorithm: 'SHA-256' })).toEqual(hash);
  });
});
