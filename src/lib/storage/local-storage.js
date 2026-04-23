/**
 * Safely parse a JSON string returning `null` on failure, so a single corrupt or foreign-written
 * entry doesn’t break iteration over the whole storage.
 * @param {string} raw Raw stored value.
 * @returns {any} Parsed value, or `null` on failure.
 */
const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Implement a wrapper for the Web Storage API. These methods are async just like the experimental
 * KV Storage and automatically parse/stringify JSON data.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Storage
 * @see https://developer.chrome.com/blog/kv-storage/
 */
export default class LocalStorage {
  /**
   * Save data.
   * @param {string} key Storage key.
   * @param {any} value Serializable value.
   * @throws {DOMException} When storage access is denied.
   */
  static async set(key, value) {
    // `JSON.stringify(undefined)` returns `undefined`, which would be coerced to the literal string
    // "undefined" and later throw on parse. Treat `undefined` as a delete.
    if (value === undefined) {
      globalThis.localStorage.removeItem(key);

      return;
    }

    globalThis.localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Retrieve data by key.
   * @param {string} key Storage key.
   * @returns {Promise<*>} Data.
   * @throws {DOMException} When storage access is denied.
   */
  static async get(key) {
    const cache = globalThis.localStorage.getItem(key);

    return cache ? safeParse(cache) : null;
  }

  /**
   * Delete data by key.
   * @param {string} key Storage key.
   * @throws {DOMException} When storage access is denied.
   */
  static async delete(key) {
    globalThis.localStorage.removeItem(key);
  }

  /**
   * Clear the storage.
   * @throws {DOMException} When storage access is denied.
   */
  static async clear() {
    globalThis.localStorage.clear();
  }

  /**
   * Get a list of storage keys.
   * @returns {Promise<string[]>} Keys.
   * @throws {DOMException} When storage access is denied.
   */
  static async keys() {
    return Object.keys(globalThis.localStorage);
  }

  /**
   * Get a list of storage values. Entries with invalid JSON are returned as `null` instead of
   * throwing, so third-party/foreign entries on the same origin don’t break iteration.
   * @returns {Promise<*[]>} Values.
   * @throws {DOMException} When storage access is denied.
   */
  static async values() {
    return Object.values(globalThis.localStorage).map(safeParse);
  }

  /**
   * Get a list of storage entries. Entries with invalid JSON are returned with a `null` value
   * instead of throwing.
   * @returns {Promise<[string, any][]>} Entries.
   * @throws {DOMException} When storage access is denied.
   */
  static async entries() {
    return Object.entries(globalThis.localStorage).map(([key, value]) => [key, safeParse(value)]);
  }
}
