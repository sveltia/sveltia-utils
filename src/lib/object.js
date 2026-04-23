/**
 * Check if the given input is a simple object.
 * @param {any} input Input, probably an object.
 * @returns {input is Record<string, any>} Result.
 */
const isObject = (input) => input !== null && typeof input === 'object' && !Array.isArray(input);
/**
 * Convert a Proxy to the original object. The built-in `structuredClone()` method throws with a
 * Proxy in some environments, so this can be used instead. The name of `toRaw` is derived from the
 * equivalent in Vue.
 * Note: this is JSON-based, so the following values are lost or transformed:
 * - `Date` → ISO string
 * - `Map`/`Set` → `{}`
 * - `undefined`, functions, symbols → dropped
 * - `BigInt` → throws
 * - circular references → throws
 * For richer cloning of plain objects, prefer `structuredClone()` directly.
 * @param {object} obj Proxified object.
 * @returns {object} Deproxified object.
 */
const toRaw = (obj) => JSON.parse(JSON.stringify(obj));

export { isObject, toRaw };
