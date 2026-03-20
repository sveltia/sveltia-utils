import { describe, expect, test } from 'vitest';
import { isObject, toRaw } from './object.js';

describe('Test isObject()', () => {
  test('plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ foo: 1 })).toBe(true);
    expect(isObject({ a: { b: 2 } })).toBe(true);
  });

  test('non-objects', () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject('string')).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });
});

describe('Test toRaw()', () => {
  test('plain object', () => {
    const obj = { a: 1, b: 'two', c: true };

    expect(toRaw(obj)).toEqual(obj);
  });

  test('nested object', () => {
    const obj = { a: { b: { c: 3 } } };

    expect(toRaw(obj)).toEqual(obj);
  });

  test('returns a new object (not the same reference)', () => {
    const obj = { x: 1 };
    const raw = toRaw(obj);

    expect(raw).toEqual(obj);
    expect(raw).not.toBe(obj);
  });

  test('object with array values', () => {
    const obj = { list: [1, 2, 3] };

    expect(toRaw(obj)).toEqual(obj);
  });
});
