import { isObject } from './object';

/**
 * Check if the given input is an array of objects.
 * @param {any} input - Input, probably an array.
 * @returns {boolean} Result.
 */
export const isObjectArray = (input) =>
  Array.isArray(input) && /** @type {any[]} */ (input).every((item) => isObject(item));

/**
 * Remove duplicate values from the given array.
 * @param {any[]} array - Original array with primitive values.
 * @returns {any[]} - Array without duplicates.
 */
export const unique = (array) => [...new Set(array)];
