/**
 * Check if the given input is a simple object.
 * @param {any} input - Input, probably an object.
 * @returns {boolean} Result.
 */
export const isObject = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/**
 * Convert a Proxy to the original object. The built-in `structuredClone()` method throws with a
 * Proxy, so this can be used instead. The name of `toRaw` is derived from the equivalent in Vue.
 * @param {object} obj - Proxified object.
 * @returns {object} Deproxified object.
 */
export const toRaw = (obj) => JSON.parse(JSON.stringify(obj));
