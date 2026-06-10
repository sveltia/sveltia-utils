import { generateUUID } from './crypto.js';

/** @type {Map<HTMLElement, () => void> | undefined} */
let visibilityResolvers;
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

  visibilityResolvers = new Map();

  sharedVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting || !(target instanceof HTMLElement)) {
        return;
      }

      const resolve = visibilityResolvers?.get(target);

      if (resolve) {
        visibilityResolvers?.delete(target);
        sharedVisibilityObserver?.unobserve(target);
        resolve();
      }
    });
  });

  return sharedVisibilityObserver;
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
 * @param {HTMLElement | undefined} element Element to observe.
 * @returns {void | Promise<void>} Promise to be resolved when the element becomes visible. If the
 * `element` is not available yet, `undefined` will be returned instead.
 */
const waitForVisibility = (element) => {
  if (!element) {
    return undefined;
  }

  const observer = getSharedVisibilityObserver();

  if (!observer) {
    return undefined;
  }

  if (isVisible(element)) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    visibilityResolvers?.set(element, resolve);
    scheduleVisibilityCheck(() => {
      observer.observe(element);
    });
  });
};

export { generateElementId, isVisible, waitForVisibility };
