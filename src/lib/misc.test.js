import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { sleep } from './misc.js';

describe('Test sleep()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('resolves after the given milliseconds', async () => {
    const promise = sleep(1000);

    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  test('defaults to 0ms', async () => {
    const promise = sleep();

    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();
  });

  test('resolves with undefined', async () => {
    const promise = sleep(100);

    vi.advanceTimersByTime(100);

    const result = await promise;

    expect(result).toBeUndefined();
  });
});
