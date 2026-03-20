import { afterEach, describe, expect, test, vi } from 'vitest';
import { generateElementId, waitForVisibility } from './element.js';

describe('Test generateElementId()', () => {
  test('default prefix and length', () => {
    const id = generateElementId();

    expect(id).toMatch(/^e-[0-9a-f]{7}$/);
  });

  test('custom prefix', () => {
    const id = generateElementId('popup');

    expect(id).toMatch(/^popup-[0-9a-f]{7}$/);
  });

  test('custom prefix and length', () => {
    const id = generateElementId('btn', 12);

    expect(id).toMatch(/^btn-[0-9a-f]{12}$/);
  });

  test('returns different IDs on each call', () => {
    const id1 = generateElementId();
    const id2 = generateElementId();

    expect(id1).not.toEqual(id2);
  });
});

describe('Test waitForVisibility()', () => {
  test('returns undefined when element is not provided', () => {
    expect(waitForVisibility(undefined)).toBeUndefined();
  });

  test('returns a Promise when element is provided', () => {
    const element = document.createElement('div');
    const result = waitForVisibility(element);

    expect(result).toBeInstanceOf(Promise);
  });

  test('resolves when element becomes visible', async () => {
    /** @type {any} */
    let intersectionCallback = undefined;

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        /** @param {IntersectionObserverCallback} cb */
        constructor(cb) {
          intersectionCallback = cb;
        }

        observe() {}

        disconnect() {}
      },
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => cb(0));

    const element = document.createElement('div');
    const promise = waitForVisibility(element);

    intersectionCallback([{ isIntersecting: false }]); // not yet visible — keeps watching
    intersectionCallback([{ isIntersecting: true }]);
    await expect(promise).resolves.toBeUndefined();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
