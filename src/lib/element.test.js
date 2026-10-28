import { afterEach, describe, expect, test, vi } from 'vitest';

const loadModule = () => import('./element.js');

describe('Test removeVisibilityResolver()', () => {
  test('does not throw before the shared observer is created', async () => {
    vi.resetModules();

    const { removeVisibilityResolver } = await loadModule();

    expect(() => removeVisibilityResolver(document.createElement('div'))).not.toThrow();
  });
});

/**
 * Build a `DOMRect`-like object for `getBoundingClientRect` mocks.
 * @param {{ top: number, left: number, bottom: number, right: number }} rect Edges.
 * @returns {DOMRect} Rect.
 */
const createRect = ({ top, left, bottom, right }) =>
  /** @type {DOMRect} */ ({
    top,
    left,
    bottom,
    right,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    toJSON: () => ({}),
  });

describe('Test isVisible()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ['inside the viewport', { top: 10, left: 10, bottom: 20, right: 20 }, true],
    ['partially above the viewport', { top: -10, left: 0, bottom: 5, right: 10 }, true],
    ['entirely above the viewport', { top: -20, left: 0, bottom: 0, right: 10 }, false],
    ['entirely left of the viewport', { top: 0, left: -20, bottom: 10, right: 0 }, false],
    ['below the viewport', { top: 100, left: 0, bottom: 120, right: 10 }, false],
    ['right of the viewport', { top: 0, left: 100, bottom: 10, right: 120 }, false],
  ])('element %s', async (_label, rect, expected) => {
    vi.stubGlobal('innerHeight', 100);
    vi.stubGlobal('innerWidth', 100);

    const { isVisible } = await loadModule();
    const element = document.createElement('div');

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createRect(rect));

    expect(isVisible(element)).toBe(expected);
  });
});

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

  test('resolves every pending call for the same element', async () => {
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
    const first = waitForVisibility(element);
    const second = waitForVisibility(element);

    intersectionCallback([{ isIntersecting: true, target: element }]);
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  test('does not observe an element whose resolver was removed before the check', async () => {
    vi.resetModules();

    const observe = vi.fn();
    /** @type {FrameRequestCallback | undefined} */
    let frameCallback = undefined;

    vi.stubGlobal(
      'IntersectionObserver',
      createIntersectionObserverMock({ onObserve: observe, onUnobserve: () => {} }),
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => {
      frameCallback = cb;
    });

    const { removeVisibilityResolver, waitForVisibility } = await loadModule();
    const element = document.createElement('div');

    waitForVisibility(element);
    removeVisibilityResolver(element);
    /** @type {any} */ (frameCallback)(0);

    expect(observe).not.toHaveBeenCalled();
  });

  test('removeVisibilityResolver() stops observing and leaves the Promise pending', async () => {
    vi.resetModules();

    /** @type {any} */
    let intersectionCallback = undefined;
    const unobserve = vi.fn();

    vi.stubGlobal(
      'IntersectionObserver',
      createIntersectionObserverMock({
        onConstructor: (/** @type {IntersectionObserverCallback} */ cb) => {
          intersectionCallback = cb;
        },
        onUnobserve: unobserve,
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => cb(0));

    const { removeVisibilityResolver, waitForVisibility } = await loadModule();
    const element = document.createElement('div');
    const onResolve = vi.fn();

    /** @type {Promise<void>} */ (waitForVisibility(element)).then(onResolve);
    removeVisibilityResolver(element);
    expect(unobserve).toHaveBeenCalledWith(element);

    // A late intersection entry for the removed element is ignored
    intersectionCallback([{ isIntersecting: true, target: element }]);
    await Promise.resolve();
    expect(onResolve).not.toHaveBeenCalled();
  });

  test('ignores intersecting entries whose target is not an HTMLElement', async () => {
    vi.resetModules();

    /** @type {any} */
    let intersectionCallback = undefined;

    vi.stubGlobal(
      'IntersectionObserver',
      createIntersectionObserverMock({
        onConstructor: (/** @type {IntersectionObserverCallback} */ cb) => {
          intersectionCallback = cb;
        },
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (/** @type {FrameRequestCallback} */ cb) => cb(0));

    const { waitForVisibility } = await loadModule();
    const element = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    waitForVisibility(element);

    expect(() => intersectionCallback([{ isIntersecting: true, target: svg }])).not.toThrow();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });
});

/**
 * Stub `IntersectionObserver` and record what each observer created is given.
 * @returns {{ observers: { callback: IntersectionObserverCallback, options: any, observe: any,
 * unobserve: any }[] }} Created observers.
 */
const stubIntersectionObserver = () => {
  /** @type {any[]} */
  const observers = [];

  vi.stubGlobal(
    'IntersectionObserver',
    /** @type {any} */ (
      function IntersectionObserverMock(
        /** @type {IntersectionObserverCallback} */ callback,
        /** @type {any} */ options,
      ) {
        const record = { callback, options, observe: vi.fn(), unobserve: vi.fn() };

        observers.push(record);
        /** @type {any} */
        this.observe = record.observe;
        /** @type {any} */
        this.unobserve = record.unobserve;

        this.disconnect = () => {};
      }
    ),
  );

  return { observers };
};

/**
 * Report the given visibility of an element to an observer’s callback.
 * @param {any} record Observer record.
 * @param {Element} target Element.
 * @param {boolean} isIntersecting Whether the element is visible.
 */
const report = (record, target, isIntersecting) => {
  record.callback([{ target, isIntersecting }], /** @type {any} */ ({}));
};

describe('Test observeVisibility()', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  test('returns a no-op when IntersectionObserver is unavailable', async () => {
    vi.resetModules();

    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Reflect.deleteProperty(globalThis, 'IntersectionObserver');

    try {
      const { observeVisibility } = await loadModule();
      const listener = vi.fn();

      expect(() => observeVisibility(document.createElement('div'), listener)()).not.toThrow();
      expect(listener).not.toHaveBeenCalled();
    } finally {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
  });

  test('shares one observer per root margin and never reads the layout', async () => {
    vi.resetModules();

    const { observers } = stubIntersectionObserver();
    const { observeVisibility } = await loadModule();
    const first = document.createElement('div');
    const second = document.createElement('div');
    const rectSpy = vi.spyOn(first, 'getBoundingClientRect');

    observeVisibility(first, () => {});
    observeVisibility(second, () => {});
    observeVisibility(first, () => {}, { rootMargin: '200px 0px' });

    expect(observers).toHaveLength(2);
    expect(observers[0].options).toEqual({ rootMargin: '0px' });
    expect(observers[1].options).toEqual({ rootMargin: '200px 0px' });
    expect(observers[0].observe).toHaveBeenCalledTimes(2);
    expect(rectSpy).not.toHaveBeenCalled();
  });

  test('reports every change to every listener until it stops', async () => {
    vi.resetModules();

    const { observers } = stubIntersectionObserver();
    const { observeVisibility } = await loadModule();
    const element = document.createElement('div');
    const other = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = observeVisibility(element, first);
    const stopSecond = observeVisibility(element, second);
    const [record] = observers;

    // The element is observed once, however many listeners it has
    expect(record.observe).toHaveBeenCalledOnce();

    report(record, element, true);
    report(record, element, false);
    // An element nobody listens to is ignored
    report(record, other, true);
    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(second.mock.calls).toEqual([[true], [false]]);

    stopFirst();
    expect(record.unobserve).not.toHaveBeenCalled();
    report(record, element, true);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(3);

    stopSecond();
    expect(record.unobserve).toHaveBeenCalledExactlyOnceWith(element);

    // A stale stop function doesn’t unobserve the element observed again since
    observeVisibility(element, () => {});
    stopSecond();
    expect(record.unobserve).toHaveBeenCalledOnce();
  });
});

describe('Test whenSteadilyVisible()', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  test('calls back in a microtask when IntersectionObserver is unavailable', async () => {
    vi.resetModules();

    const originalIntersectionObserver = globalThis.IntersectionObserver;

    Reflect.deleteProperty(globalThis, 'IntersectionObserver');

    try {
      const { whenSteadilyVisible } = await loadModule();
      const callback = vi.fn();
      const cancelled = vi.fn();

      whenSteadilyVisible(document.createElement('div'), callback);
      // Not before the function has returned, so the callback can use the cancel function
      expect(callback).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(callback).toHaveBeenCalledOnce();

      whenSteadilyVisible(document.createElement('div'), cancelled)();
      await Promise.resolve();
      expect(cancelled).not.toHaveBeenCalled();
    } finally {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
  });

  test('calls back once the element has stayed visible, then stops observing', async () => {
    vi.resetModules();
    vi.useFakeTimers();

    const { observers } = stubIntersectionObserver();
    const { whenSteadilyVisible } = await loadModule();
    const element = document.createElement('div');
    const callback = vi.fn();

    whenSteadilyVisible(element, callback, { delay: 50, rootMargin: '10px' });

    const [record] = observers;

    expect(record.options).toEqual({ rootMargin: '10px' });

    // Passing through the viewport doesn’t count
    report(record, element, true);
    vi.advanceTimersByTime(40);
    report(record, element, false);
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();

    report(record, element, true);
    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledOnce();
    expect(record.unobserve).toHaveBeenCalledWith(element);
  });

  test('waits 100 ms by default, and can be cancelled', async () => {
    vi.resetModules();
    vi.useFakeTimers();

    const { observers } = stubIntersectionObserver();
    const { whenSteadilyVisible } = await loadModule();
    const element = document.createElement('div');
    const callback = vi.fn();
    const cancel = whenSteadilyVisible(element, callback);
    const [record] = observers;

    report(record, element, true);
    vi.advanceTimersByTime(99);
    cancel();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    expect(record.unobserve).toHaveBeenCalledWith(element);
  });
});
