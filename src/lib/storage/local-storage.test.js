import { beforeEach, describe, expect, test } from 'vitest';
import LocalStorage from './local-storage.js';

// Set up a proper localStorage mock since happy-dom doesn't fully implement it
const makeStorage = () => {
  const store = Object.create(null);

  return Object.defineProperties(store, {
    setItem: {
      value: (/** @type {string} */ key, /** @type {any} */ value) => {
        store[key] = value;
      },
      enumerable: false,
    },
    getItem: {
      value: (/** @type {string} */ key) => (key in store ? store[key] : null),
      enumerable: false,
    },
    removeItem: {
      value: (/** @type {string} */ key) => {
        delete store[key];
      },
      enumerable: false,
    },
    clear: {
      value: () => {
        Object.keys(store).forEach((key) => {
          delete store[key];
        });
      },
      enumerable: false,
    },
  });
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
  });
});

describe('Test LocalStorage', () => {
  test('set and get', async () => {
    await LocalStorage.set('number', 42);
    await LocalStorage.set('string', 'hello');
    await LocalStorage.set('boolean', true);
    await LocalStorage.set('array', [1, 2, 3]);
    await LocalStorage.set('object', { a: 1 });

    expect(await LocalStorage.get('number')).toEqual(42);
    expect(await LocalStorage.get('string')).toEqual('hello');
    expect(await LocalStorage.get('boolean')).toEqual(true);
    expect(await LocalStorage.get('array')).toEqual([1, 2, 3]);
    expect(await LocalStorage.get('object')).toEqual({ a: 1 });
  });

  test('get returns null for missing key', async () => {
    expect(await LocalStorage.get('nonexistent')).toBeNull();
  });

  test('keys and values and entries', async () => {
    await LocalStorage.clear();
    await LocalStorage.set('x', 10);
    await LocalStorage.set('y', 20);

    const keys = await LocalStorage.keys();

    expect(keys.sort()).toEqual(['x', 'y']);

    const values = await LocalStorage.values();

    expect(values.sort()).toEqual([10, 20]);

    const entries = await LocalStorage.entries();
    const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b));

    expect(sortedEntries).toEqual([
      ['x', 10],
      ['y', 20],
    ]);
  });

  test('delete', async () => {
    await LocalStorage.clear();
    await LocalStorage.set('del', 'value');
    expect(await LocalStorage.get('del')).toEqual('value');
    await LocalStorage.delete('del');
    expect(await LocalStorage.get('del')).toBeNull();
  });

  test('clear', async () => {
    await LocalStorage.set('a', 1);
    await LocalStorage.set('b', 2);
    await LocalStorage.clear();
    expect(await LocalStorage.keys()).toEqual([]);
  });

  test('set(key, undefined) deletes the key instead of storing "undefined"', async () => {
    await LocalStorage.set('maybe', 'value');
    expect(await LocalStorage.get('maybe')).toEqual('value');

    await LocalStorage.set('maybe', undefined);
    expect(await LocalStorage.get('maybe')).toBeNull();
    expect(await LocalStorage.keys()).not.toContain('maybe');
  });

  test('get returns null for corrupt / foreign JSON instead of throwing', async () => {
    // Simulate a foreign script writing a non-JSON string to the same origin
    globalThis.localStorage.setItem('foreign', 'not json {');
    await expect(LocalStorage.get('foreign')).resolves.toBeNull();
  });

  test('values() and entries() tolerate corrupt entries', async () => {
    await LocalStorage.clear();
    await LocalStorage.set('good', { a: 1 });
    globalThis.localStorage.setItem('bad', 'not json {');

    const values = await LocalStorage.values();

    expect(values).toEqual(expect.arrayContaining([{ a: 1 }, null]));

    const entries = await LocalStorage.entries();
    const entryMap = new Map(entries);

    expect(entryMap.get('good')).toEqual({ a: 1 });
    expect(entryMap.get('bad')).toBeNull();
  });
});
