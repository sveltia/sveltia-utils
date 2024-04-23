/**
 * Check if the given input is a simple object.
 * @param {any} input - Input, probably an object.
 * @returns {boolean} Result.
 */
export const isObject = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/**
 * Check if the given input is an array of objects.
 * @param {any} input - Input, probably an array.
 * @returns {boolean} Result.
 */
export const isObjectArray = (input) =>
  Array.isArray(input) && /** @type {any[]} */ (input).every((item) => isObject(item));
