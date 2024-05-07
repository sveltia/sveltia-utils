import { generateUUID } from '$lib/crypto';

/**
 * Get a random ID that can be used for elements.
 * @param {string} [prefix] - Prefix to be added to the ID, e.g. `popup`.
 * @param {number} [length] - Number of characters to be used in the ID.
 * @returns {string} Generated ID.
 */
export const generateElementId = (prefix = 'e', length = 7) =>
  [prefix, generateUUID(length)].join('-');

/**
 * Wait until the given element enters the viewport.
 * @param {HTMLElement | undefined} element - Element to observe.
 * @returns {void | Promise<void>} Promise to be resolved when the element becomes visible. If the
 * `element` is not available yet, `undefined` will be returned instead.
 */
export const waitForVisibility = (element) => {
  if (!element) {
    return void 0;
  }

  return new Promise((resolve) => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        resolve(void 0);
      }
    });

    globalThis.requestAnimationFrame(() => {
      observer.observe(element);
    });
  });
};
