import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import IndexedDB from './indexed-db.js';

// https://github.com/vitest-dev/vitest/discussions/908
globalThis.indexedDB = indexedDB;

describe('Test IndexedDB', () => {
  test('Without options', async () => {
    const db = new IndexedDB('vite', 'test-1');

    expect(await db.keys()).toEqual([]);
    expect(await db.set('one', 1)).toEqual('one');
    expect(await db.set('two', '2')).toEqual('two');
    expect(await db.set('three', true)).toEqual('three');
    expect(await db.set('four', [1, 2, 3])).toEqual('four');
    expect(await db.set('five', { a: 1, b: 2 })).toEqual('five');

    expect(await db.get('none')).toEqual(undefined);
    expect(await db.get('one')).toEqual(1);
    expect(await db.get('two')).toEqual('2');
    expect(await db.get('three')).toEqual(true);
    expect(await db.get('four')).toEqual([1, 2, 3]);
    expect(await db.get('five')).toEqual({ a: 1, b: 2 });

    expect(await db.keys()).toEqual(['five', 'four', 'one', 'three', 'two']);
    expect(await db.values()).toEqual([{ a: 1, b: 2 }, [1, 2, 3], 1, true, '2']);
    expect(await db.entries()).toEqual([
      ['five', { a: 1, b: 2 }],
      ['four', [1, 2, 3]],
      ['one', 1],
      ['three', true],
      ['two', '2'],
    ]);

    expect(await db.delete('one')).toEqual(undefined);
    expect(await db.keys()).toEqual(['five', 'four', 'three', 'two']);
    expect(await db.deleteEntries(['two', 'three'])).toEqual(undefined);
    expect(await db.keys()).toEqual(['five', 'four']);
    expect(await db.clear()).toEqual(undefined);
    expect(await db.keys()).toEqual([]);
  });

  test('saveEntries', async () => {
    const db = new IndexedDB('vite', 'test-6');

    await db.saveEntries([
      ['alpha', 100],
      ['beta', 200],
      ['gamma', 300],
    ]);

    expect(await db.get('alpha')).toEqual(100);
    expect(await db.get('beta')).toEqual(200);
    expect(await db.get('gamma')).toEqual(300);
    expect(await db.keys()).toEqual(['alpha', 'beta', 'gamma']);
  });

  test('Auto generating keys', async () => {
    const db = new IndexedDB('vite', 'test-2', { keyPath: 'id', autoIncrement: true });

    expect(await db.put({ title: 'one' })).toEqual(1);
    expect(await db.put({ title: 'two' })).toEqual(2);
    expect(await db.put({ title: 'three' })).toEqual(3);

    expect(await db.get(1)).toEqual({ id: 1, title: 'one' });
    expect(await db.get(2)).toEqual({ id: 2, title: 'two' });
    expect(await db.get(3)).toEqual({ id: 3, title: 'three' });

    expect(await db.keys()).toEqual([1, 2, 3]);
    expect(await db.delete(2)).toEqual(undefined);
    expect(await db.keys()).toEqual([1, 3]);
  });

  test('Composite key', async () => {
    const db = new IndexedDB('vite', 'test-3', { keyPath: ['userId', 'productId'] });

    expect(await db.put({ userId: 123, productId: 456 })).toEqual([123, 456]);
    expect(await db.put({ userId: 234, productId: 567 })).toEqual([234, 567]);

    expect(await db.get([123, 456])).toEqual({ userId: 123, productId: 456 });
    expect(await db.get([234, 567])).toEqual({ userId: 234, productId: 567 });

    expect(await db.keys()).toEqual([
      [123, 456],
      [234, 567],
    ]);
    expect(await db.delete([123, 456])).toEqual(undefined);
    expect(await db.keys()).toEqual([[234, 567]]);
  });

  test('Find items', async () => {
    const db = new IndexedDB('vite', 'test-4', {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [{ name: 'year', keyPath: 'year' }],
    });

    expect(await db.put({ year: 2023, category: 'book' })).toEqual(1);
    expect(await db.put({ year: 2024, category: 'book' })).toEqual(2);
    expect(await db.put({ year: 2025, category: 'book' })).toEqual(3);
    expect(await db.put({ year: 2023, category: 'software' })).toEqual(4);
    expect(await db.put({ year: 2024, category: 'software' })).toEqual(5);
    expect(await db.put({ year: 2025, category: 'software' })).toEqual(6);

    expect(await db.find(({ year }) => year === 2023)).toEqual({
      id: 1,
      year: 2023,
      category: 'book',
    });
    expect(await db.find(undefined, { index: 'year', query: IDBKeyRange.only(2024) })).toEqual({
      id: 2,
      year: 2024,
      category: 'book',
    });
    expect(await db.find(({ year }) => year === 2022)).toEqual(undefined);
    expect(await db.findLast(({ year }) => year === 2024)).toEqual({
      id: 5,
      year: 2024,
      category: 'software',
    });
    expect(
      await db.findLast(undefined, { index: 'year', query: IDBKeyRange.bound(2024, 2025) }),
    ).toEqual({
      id: 6,
      year: 2025,
      category: 'software',
    });
    expect(await db.filter(({ category, year }) => category === 'software' && year < 2025)).toEqual(
      [
        {
          id: 4,
          year: 2023,
          category: 'software',
        },
        {
          id: 5,
          year: 2024,
          category: 'software',
        },
      ],
    );
    expect(
      await db.filter(({ category }) => category === 'book', {
        index: 'year',
        query: IDBKeyRange.bound(2024, 2025),
      }),
    ).toEqual([
      {
        id: 2,
        year: 2024,
        category: 'book',
      },
      {
        id: 3,
        year: 2025,
        category: 'book',
      },
    ]);
    expect(await db.filter(({ category }) => category === 'tablet')).toEqual([]);
  });

  test('Upgrading existing store with a new index', async () => {
    // First access: creates the store with a 'year' index
    const db1 = new IndexedDB('vite', 'test-8', {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [{ name: 'year', keyPath: 'year' }],
    });

    expect(await db1.put({ year: 2023, title: 'one' })).toEqual(1);
    expect(await db1.keys()).toEqual([1]);

    // Second access: same db/store, but requests an additional 'title' index.
    // This triggers onupgradeneeded where:
    //   - objectStoreNames.contains('test-8') is TRUE  → takes the existing-store branch
    //   - 'year' already exists → !indexNames.contains('year') is false → skipped
    //   - 'title' is new → created
    const db2 = new IndexedDB('vite', 'test-8', {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'year', keyPath: 'year' },
        { name: 'title', keyPath: 'title' },
      ],
    });

    expect(await db2.keys()).toEqual([1]);
    expect(await db2.get(1)).toEqual({ id: 1, year: 2023, title: 'one' });
  });
});

describe('Error paths', () => {
  test('rejects when indexedDB.open fails', async () => {
    const error = new DOMException('Open failed', 'UnknownError');
    const originalIndexedDB = globalThis.indexedDB;

    /** @type {any} */ (globalThis).indexedDB = {
      open() {
        const request = /** @type {any} */ ({
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
        });

        setTimeout(() => {
          Object.defineProperty(request, 'error', { value: error });
          request.onerror?.();
        }, 0);

        return request;
      },
    };

    const db = new IndexedDB('fail-open', 'fail-store');

    try {
      await expect(db.keys()).rejects.toBe(error);
    } finally {
      /** @type {any} */ (globalThis).indexedDB = originalIndexedDB;
    }
  });

  test('rejects when a transaction errors', async () => {
    const error = new DOMException('Transaction failed', 'UnknownError');
    const originalIndexedDB = globalThis.indexedDB;
    let txCallCount = 0;

    const fakeDB = {
      version: 1,
      objectStoreNames: { contains: () => true },
      onversionchange: null,
      close() {},
      transaction() {
        txCallCount += 1;

        // First call is from #getDatabase() to check existing indexes
        if (txCallCount === 1) {
          return { objectStore: () => ({ indexNames: { contains: () => true } }) };
        }

        // Second call is from #query — fire onerror to trigger rejection
        const tx = /** @type {any} */ ({
          objectStore: () => ({ getAllKeys: () => ({}) }),
          get error() {
            return error;
          },
        });

        setTimeout(() => tx.onerror?.(), 0);

        return tx;
      },
    };

    const fakeRequest = /** @type {any} */ ({
      result: fakeDB,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    });

    /** @type {any} */ (globalThis).indexedDB = {
      open() {
        setTimeout(() => fakeRequest.onsuccess?.(), 0);

        return fakeRequest;
      },
    };

    const db = new IndexedDB('tx-fail', 'tx-store');

    try {
      await expect(db.keys()).rejects.toBe(error);
    } finally {
      /** @type {any} */ (globalThis).indexedDB = originalIndexedDB;
    }
  });

  test('entries(), find(), findLast(), filter() reject when database fails to open', async () => {
    const error = new DOMException('Open failed', 'UnknownError');
    const originalIndexedDB = globalThis.indexedDB;

    /** @type {any} */ (globalThis).indexedDB = {
      open() {
        const request = /** @type {any} */ ({
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
        });

        setTimeout(() => {
          Object.defineProperty(request, 'error', { value: error });
          request.onerror?.();
        }, 0);

        return request;
      },
    };

    const db = new IndexedDB('fail-cursor', 'fail-store');

    try {
      await expect(db.entries()).rejects.toBe(error);
      await expect(db.find()).rejects.toBe(error);
      await expect(db.findLast()).rejects.toBe(error);
      await expect(db.filter()).rejects.toBe(error);
    } finally {
      /** @type {any} */ (globalThis).indexedDB = originalIndexedDB;
    }
  });
});
