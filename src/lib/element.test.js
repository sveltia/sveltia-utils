import { afterEach, describe, expect, test, vi } from 'vitest';

const loadModule = () => import('./element.js');

/**
 * Build a minimal IntersectionObserver stub for the visibility tests.
 * @param {object} [options] Stub hooks.
 * @param {(callback: IntersectionObserverCallback) => void} [options.onConstructor]
 * @param {() => void} [options.onObserve]
 * @param {() => void} [options.onUnobserve]
 * @returns {any} A mock constructor.
 */
const createIntersectionObserverMock = (options = {}) => {
  const { onConstructor = () => {}, onObserve = () => {}, onUnobserve = () => {} } = options;

  return /** @type {any} */ (
    function IntersectionObserverMock(/** @type {IntersectionObserverCallback} */ callback) {
      onConstructor(callback);

      /** @type {any} */
      this.observe = onObserve;
      /** @type {any} */
      this.unobserve = onUnobserve;

      this.disconnect = () => {};
    }
  );
};

describe('Test generateElementId()', () => {
  test('default prefix and length', async () => {
    const { generateElementId } = await loadModule();
    const id = generateElementId();

    expect(id).toMatch(/^e-[0-9a-f]{7}$/);
  });

  test('custom prefix', async () => {
    const { generateElementId } = await loadModule();
    const id = generateElementId('popup');

    expect(id).toMatch(/^popup-[0-9a-f]{7}$/);
  });

  test('custom prefix and length', async () => {
    const { generateElementId } = await loadModule();
    const id = generateElementId('btn', 12);

    expect(id).toMatch(/^btn-[0-9a-f]{12}$/);
  });

  test('returns different IDs on each call', async () => {
    const { generateElementId } = await loadModule();
    const id1 = generateElementId();
    const id2 = generateElementId();

    expect(id1).not.toEqual(id2);
  });
});

describe('Test waitForVisibility()', () => {
  test('returns undefined when IntersectionObserver is unavailable', async () => {
    vi.resetModules();

    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Reflect.deleteProperty(globalThis, 'IntersectionObserver');

    try {
      const { waitForVisibility } = await loadModule();

      expect(waitForVisibility(document.createElement('div'))).toBeUndefined();
    } finally {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
  });

  test('reuses the shared observer for subsequent calls', async () => {
    vi.resetModules();

    /** @type {number} */
    let observerCount = 0;

    vi.stubGlobal(
      'IntersectionObserver',
      createIntersectionObserverMock({
        onConstructor: () => {
          observerCount += 1;
        },
        onObserve: () => {},
        onUnobserve: () => {},
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => cb(0));

    const { waitForVisibility } = await loadModule();
    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');

    waitForVisibility(firstElement);
    waitForVisibility(secondElement);

    expect(observerCount).toBe(1);
  });

  test('falls back to setTimeout when requestAnimationFrame is unavailable', async () => {
    vi.resetModules();

    /** @type {number} */
    let timeoutDelay = 0;

    vi.stubGlobal('IntersectionObserver', createIntersectionObserverMock());
    Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
    vi.stubGlobal('setTimeout', (/** @type {() => void} */ callback) => {
      timeoutDelay = 16;
      callback();

      return 1;
    });

    const { waitForVisibility } = await loadModule();
    const element = document.createElement('div');
    const result = waitForVisibility(element);

    expect(result).toBeInstanceOf(Promise);
    expect(timeoutDelay).toBe(16);
  });

  test('resolves immediately when the element is already visible', async () => {
    vi.resetModules();

    const element = document.createElement('div');

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 10,
      right: 10,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      toJSON: () => ({}),
    });
    vi.stubGlobal('IntersectionObserver', createIntersectionObserverMock());
    vi.stubGlobal('innerHeight', 100);
    vi.stubGlobal('innerWidth', 100);

    const { waitForVisibility } = await loadModule();

    await expect(waitForVisibility(element)).resolves.toBeUndefined();
  });

  test('returns undefined when element is not provided', async () => {
    const { waitForVisibility } = await loadModule();

    expect(waitForVisibility(undefined)).toBeUndefined();
  });

  test('returns a Promise when element is provided', async () => {
    const { waitForVisibility } = await loadModule();
    const element = document.createElement('div');
    const result = waitForVisibility(element);

    expect(result).toBeInstanceOf(Promise);
  });

  test('resolves when element becomes visible', async () => {
    vi.resetModules();

    /** @type {any} */
    let intersectionCallback = undefined;

    vi.stubGlobal(
      'IntersectionObserver',
      createIntersectionObserverMock({
        onConstructor: (/** @type {IntersectionObserverCallback} */ cb) => {
          intersectionCallback = cb;
        },
        onObserve: () => {},
        onUnobserve: () => {},
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => cb(0));

    const { waitForVisibility } = await loadModule();
    const element = document.createElement('div');
    const promise = waitForVisibility(element);

    // not yet visible — keeps watching
    intersectionCallback([{ isIntersecting: false, target: element }]);

    intersectionCallback([{ isIntersecting: true, target: element }]);
    await expect(promise).resolves.toBeUndefined();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });
});
