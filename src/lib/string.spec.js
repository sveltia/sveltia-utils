import { describe, expect, test } from 'vitest';
import { compare } from '$lib/string';

describe('Test compare()', () => {
  test('simple', () => {
    expect(['Lorem', 'ipsum'].sort(compare)).toEqual(['ipsum', 'Lorem']);
    expect(
      ['sample-1.jpg', 'sample-10.jpg', 'sample-99.jpg', 'sample-2.jpg'].sort(compare),
    ).toEqual(['sample-1.jpg', 'sample-2.jpg', 'sample-10.jpg', 'sample-99.jpg']);
  });
});
