/**
 * Escape the given string so it can be used safely for `new RegExp()`.
 * @param {string} string Original string.
 * @returns {string} Escaped string.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Truncate the given string.
 * @param {string} string Original string.
 * @param {number} max Maximum number of characters.
 * @param {object} [options] Options.
 * @param {string} [options.ellipsis] Character(s) to be appended if the the truncated string is
 * longer than `max`.
 * @returns {string} Truncated string.
 */
const truncate = (string, max, { ellipsis = '…' } = {}) => {
  // A string’s UTF-16 `length` is always >= its code point count, so this is a safe fast path that
  // avoids walking the string at all when it cannot possibly need truncating.
  if (string.length <= max) {
    return string.trim();
  }

  // Don’t use `split()` because it breaks Unicode characters like emoji. Every code point occupies
  // at most two UTF-16 units, so the first `max * 2` units are guaranteed to contain at least `max`
  // code points — spreading that bounded prefix costs O(max) instead of walking the whole string.
  // A surrogate pair split by the slice can only land at index >= max, so it is always discarded.
  const chars = [...string.slice(0, max * 2)];
  const truncated = chars.slice(0, max).join('').trim();
  // More code points remain either within the prefix, or beyond the point where it was cut.
  const overflow = chars.length > max || string.length > max * 2;

  return `${truncated}${overflow ? ellipsis : ''}`;
};

/**
 * Strip the leading and trailing slashes from the given string.
 * @param {string} string Original string, e.g. `/foo/bar/`.
 * @returns {string} Trimmed string, e.g. `foo/bar`.
 */
const stripSlashes = (string) => string.replace(/^\/+/, '').replace(/\/+$/, '');
/**
 * Lazily-created shared parser. `DOMParser` is stateless across `parseFromString()` calls, so one
 * instance can be reused instead of constructing a new one on every call.
 * @type {DOMParser | undefined}
 */
let sharedDOMParser;

/**
 * Remove all HTML tags from the given string, returning only the text content.
 * Security note: the returned value is plain text, not HTML. It is safe to insert via
 * `textContent`, but if you re-inject it via `innerHTML` you must re-escape it first to avoid XSS.
 * @param {string} string Original string that may include tags, e.g. `<div>Hello</div>`.
 * @returns {string} Text content, e.g. `Hello`.
 */
const stripTags = (string) => {
  sharedDOMParser ??= new DOMParser();

  return /** @type {string} */ (
    sharedDOMParser.parseFromString(string, 'text/html').body.textContent
  );
};

/**
 * Check if the given string is a URL.
 * @param {string} string String that might be a URL.
 * @returns {boolean} Result.
 */
const isURL = (string) => {
  // Check for newlines and spaces, which are not allowed in URLs
  if (/\s/.test(string)) {
    return false;
  }

  // @ts-ignore
  if (typeof URL.canParse === 'function') {
    // @ts-ignore
    return URL.canParse(string);
  }

  try {
    // eslint-disable-next-line no-new
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

/**
 * Compare strings for natural sorting.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
 */
// eslint-disable-next-line prefer-destructuring
const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

export { compare, escapeRegExp, isURL, stripSlashes, stripTags, truncate };
