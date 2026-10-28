import { generateUUID } from './crypto.js';

/** @type {WeakMap<HTMLElement, () => void>} */
const visibilityResolvers = new WeakMap();
/** @type {IntersectionObserver | undefined} */
let sharedVisibilityObserver;
/**
 * Get a random ID that can be used for elements.
 * @param {string} [prefix] Prefix to be added to the ID, e.g. `popup`.
 * @param {number} [length] Number of characters to be used in the ID.
 * @returns {string} Generated ID.
 */
const generateElementId = (prefix = 'e', length = 7) => [prefix, generateUUID(length)].join('-');

/**
 * Remove the visibility resolver for the given element and stop observing it.
 * @param {HTMLElement} element Element to remove the resolver for.
 */
const removeVisibilityResolver = (element) => {
  visibilityResolvers.delete(element);
  sharedVisibilityObserver?.unobserve(element);
};

/**
 * Create or reuse a shared observer to avoid registering one IntersectionObserver per element. This
 * keeps large lists responsive because we only create a single observer for all visibility checks
 * instead of hundreds of short-lived observers.
 * @returns {IntersectionObserver | undefined} Shared observer instance.
 */
const getSharedVisibilityObserver = () => {
  if (!('IntersectionObserver' in globalThis)) {
    return undefined;
  }

  if (sharedVisibilityObserver) {
    return sharedVisibilityObserver;
  }

  sharedVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting || !(target instanceof HTMLElement)) {
        return;
      }

      const resolve = visibilityResolvers.get(target);

      if (resolve) {
        resolve();
        removeVisibilityResolver(target);
      }
    });
  });

  return sharedVisibilityObserver;
};

/**
 * @typedef {object} VisibilityOptions
 * @property {string} [rootMargin] Margin around the viewport within which an element counts as
 * visible, in the syntax of the CSS `margin` property, e.g. `200px 0px` to start loading an image
 * just before it scrolls into view. Defaults to `0px`.
 */

/**
 * @typedef {object} SharedVisibilityObserver
 * @property {IntersectionObserver} observer Observer.
 * @property {Map<Element, Set<(visible: boolean) => void>>} listeners Functions to call when the
 * visibility of an observed element changes.
 */

/**
 * Observers shared by every element observed with the same root margin through
 * {@link observeVisibility}, keyed by that margin.
 * @type {Map<string, SharedVisibilityObserver>}
 */
const sharedVisibilityObservers = new Map();

/**
 * Create or reuse the observer shared by every element observed with the given root margin.
 * @param {string} rootMargin Root margin.
 * @returns {SharedVisibilityObserver | undefined} Shared observer, or `undefined` if
 * `IntersectionObserver` is not available.
 */
const getMarginVisibilityObserver = (rootMargin) => {
  if (!('IntersectionObserver' in globalThis)) {
    return undefined;
  }

  let shared = sharedVisibilityObservers.get(rootMargin);

  if (!shared) {
    /** @type {SharedVisibilityObserver['listeners']} */
    const listeners = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          listeners.get(target)?.forEach((listener) => {
            listener(isIntersecting);
          });
        });
      },
      { rootMargin },
    );

    shared = { observer, listeners };
    sharedVisibilityObservers.set(rootMargin, shared);
  }

  return shared;
};

/**
 * Observe whether the given element is in or near the viewport. Unlike a check with
 * `getBoundingClientRect()`, this never forces a layout: the observer reports the element’s state
 * asynchronously, first right after it’s observed, then whenever it changes. That matters in a long
 * list, where a synchronous check for every row being rendered would lay out the page each time.
 * The flip side is that, unlike with {@link waitForVisibility}, an element already in view is only
 * reported once the next frame has been laid out.
 * @param {Element} element Element to observe.
 * @param {(visible: boolean) => void} listener Function called with whether the element is visible.
 * @param {VisibilityOptions} [options] Options.
 * @returns {() => void} Function to stop observing. If `IntersectionObserver` is not available,
 * the listener is never called.
 */
const observeVisibility = (element, listener, { rootMargin = '0px' } = {}) => {
  const shared = getMarginVisibilityObserver(rootMargin);

  if (!shared) {
    return () => {};
  }

  const { observer, listeners } = shared;
  const elementListeners = listeners.get(element) ?? new Set();

  if (!elementListeners.size) {
    listeners.set(element, elementListeners);
    observer.observe(element);
  }

  elementListeners.add(listener);

  return () => {
    elementListeners.delete(listener);

    if (!elementListeners.size && listeners.get(element) === elementListeners) {
      listeners.delete(element);
      observer.unobserve(element);
    }
  };
};

/**
 * Call a function once the given element has stayed in or near the viewport for a moment. An
 * element that only passes through the viewport, as the rows do while a long list is scrolled
 * quickly, doesn’t count, so the work it would start isn’t queued ahead of what the user stops at.
 * @param {Element} element Element to observe.
 * @param {() => void} callback Function to call. If `IntersectionObserver` is not available, it’s
 * called in a microtask, so it’s never called before this function has returned.
 * @param {VisibilityOptions & { delay?: number }} [options] Options. `delay` is how long the
 * element has to stay visible, in milliseconds. Defaults to 100.
 * @returns {() => void} Function to cancel the call if it hasn’t been made yet.
 */
const whenSteadilyVisible = (element, callback, { delay = 100, ...options } = {}) => {
  if (!('IntersectionObserver' in globalThis)) {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        callback();
      }
    });

    return () => {
      cancelled = true;
    };
  }

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  const stop = observeVisibility(
    element,
    (visible) => {
      clearTimeout(timer);

      if (visible) {
        timer = setTimeout(() => {
          stop();
          callback();
        }, delay);
      }
    },
    options,
  );

  return () => {
    clearTimeout(timer);
    stop();
  };
};

/**
 * Check whether the element is already visible in the viewport.
 * @param {HTMLElement} element Element to check.
 * @returns {boolean} Whether the element is visible.
 */
const isVisible = (element) => {
  const { top, left, bottom, right } = element.getBoundingClientRect();
  const { innerHeight, innerWidth } = globalThis;

  return bottom > 0 && right > 0 && top < innerHeight && left < innerWidth;
};

/**
 * Schedule a callback to run on the next animation frame or a short timeout fallback.
 * @param {() => void} callback Callback to schedule.
 */
const scheduleVisibilityCheck = (callback) => {
  if ('requestAnimationFrame' in globalThis) {
    globalThis.requestAnimationFrame(callback);

    return;
  }

  globalThis.setTimeout(callback, 16);
};

/**
 * Wait until the given element enters the viewport.
 * @param {HTMLElement} element Element to observe.
 * @returns {void | Promise<void>} Promise to be resolved when the element becomes visible. If the
 * `element` is not available yet, `undefined` will be returned instead.
 */
const waitForVisibility = (element) => {
  const observer = getSharedVisibilityObserver();

  if (!observer) {
    return undefined;
  }

  if (isVisible(element)) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const previousResolve = visibilityResolvers.get(element);

    // Keep any pending resolver for the same element so that earlier callers are resolved too,
    // instead of being overwritten and left pending forever.
    visibilityResolvers.set(
      element,
      previousResolve
        ? () => {
            previousResolve();
            resolve();
          }
        : resolve,
    );

    scheduleVisibilityCheck(() => {
      // Don’t start observing if the resolver was removed in the meantime; nothing would ever
      // unobserve the element after that.
      if (visibilityResolvers.has(element)) {
        observer.observe(element);
      }
    });
  });
};

export {
  generateElementId,
  isVisible,
  observeVisibility,
  removeVisibilityResolver,
  waitForVisibility,
  whenSteadilyVisible,
};
