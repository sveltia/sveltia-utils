import { describe, expect, test } from 'vitest';
import { isObjectArray, unique } from './array';

describe('Test isObjectArray()', () => {
  test('simple', () => {
    expect(isObjectArray([{ foo: 1 }, { bar: 2 }])).toEqual(true);
    expect(isObjectArray([{ foo: 1 }, null])).toEqual(false);
    expect(isObjectArray([{ foo: 1 }, undefined])).toEqual(false);
    expect(isObjectArray([[1], [2]])).toEqual(false);
    expect(isObjectArray(['Lorem', 'ipsum'])).toEqual(false);
    expect(isObjectArray([1, 2])).toEqual(false);
  });
});

describe('Test unique()', () => {
  test('simple', () => {
    expect(unique([1, 2, 3, undefined, 2, 3, 4, undefined])).toEqual([1, 2, 3, undefined, 4]);
    expect(unique(['foo', 'bar', null, 'foo', null])).toEqual(['foo', 'bar', null]);
  });

  test('unsupported cases', () => {
    expect(unique([{ foo: 1 }, { foo: 1 }])).toEqual([{ foo: 1 }, { foo: 1 }]);
    expect(
      unique([
        [1, 2, 3],
        [1, 2, 3],
      ]),
    ).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ]);
  });
});
