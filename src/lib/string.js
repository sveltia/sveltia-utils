/**
 * Escape the given string so it can be used safely for `new RegExp()`.
 * @param {string} string - Original string.
 * @returns {string} Escaped string.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
export const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Truncate the given string.
 * @param {string} string - Original string.
 * @param {number} max - Maximum number of characters.
 * @param {object} [options] - Options.
 * @param {string} [options.ellipsis] - Character(s) to be appended if the the truncated string is
 * longer than `max`.
 * @returns {string} Truncated string.
 */
export const truncate = (string, max, { ellipsis = '…' } = {}) => {
  // Don’t use `split()` because it breaks Unicode characters like emoji
  const chars = [...string];
  const truncated = chars.slice(0, max).join('').trim();

  return `${truncated}${chars.length > max ? ellipsis : ''}`;
};

/**
 * Strip the leading and trailing slashes from the given string.
 * @param {string} string - Original string, e.g. `/foo/bar/`.
 * @returns {string} Trimmed string, e.g. `foo/bar`.
 */
export const stripSlashes = (string) => string.replace(/^\/+/, '').replace(/\/+$/, '');

/**
 * Remove all HTML tags from the given string so it’s safe to use in the app.
 * @param {string} string - Original string that may include tags, e.g. `<div>Hello</div>`.
 * @returns {string} Sanitized string, e.g. `Hello`.
 */
export const stripTags = (string) =>
  new DOMParser().parseFromString(string, 'text/html').body.textContent ?? '';

/**
 * Check if the given string is a URL.
 * @param {string} string - String that might be a URL.
 * @returns {boolean} Result.
 */
export const isURL = (string) => {
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
