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
  // Don’t use `split()` because it breaks Unicode characters like emoji
  const chars = [...string];
  const truncated = chars.slice(0, max).join('').trim();

  return `${truncated}${chars.length > max ? ellipsis : ''}`;
};

/**
 * Strip the leading and trailing slashes from the given string.
 * @param {string} string Original string, e.g. `/foo/bar/`.
 * @returns {string} Trimmed string, e.g. `foo/bar`.
 */
const stripSlashes = (string) => string.replace(/^\/+/, '').replace(/\/+$/, '');

/**
 * Remove all HTML tags from the given string, returning only the text content.
 * Security note: the returned value is plain text, not HTML. It is safe to insert via
 * `textContent`, but if you re-inject it via `innerHTML` you must re-escape it first to avoid XSS.
 * @param {string} string Original string that may include tags, e.g. `<div>Hello</div>`.
 * @returns {string} Text content, e.g. `Hello`.
 */
const stripTags = (string) =>
  /** @type {string} */ (new DOMParser().parseFromString(string, 'text/html').body.textContent);

/**
 * Check if the given string is a URL.
 * @param {string} string String that might be a URL.
 * @returns {boolean} Result.
 */
const isURL = (string) => {
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
