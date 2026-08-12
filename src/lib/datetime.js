/** @type {Intl.DateTimeFormatOptions} */
const partOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'longOffset',
};

/**
 * Cache of `Intl.DateTimeFormat` instances keyed by time zone. Constructing a formatter is roughly
 * an order of magnitude more expensive than using one, and every option other than `timeZone` is
 * constant here, so instances are safe to share and worth reusing.
 * @type {Map<string, Intl.DateTimeFormat>}
 */
const formatterCache = new Map();

/**
 * Get a cached `Intl.DateTimeFormat` for the given time zone.
 * @param {string} [timeZone] Time zone, e.g. `UTC`. Defaults to the runtime’s local zone.
 * @returns {Intl.DateTimeFormat} Formatter.
 */
const getFormatter = (timeZone) => {
  // `undefined` (local zone) needs a distinct key from any named zone.
  const key = timeZone ?? '';
  let formatter = formatterCache.get(key);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { ...partOptions, hour12: false, timeZone });
    formatterCache.set(key, formatter);
  }

  return formatter;
};

/**
 * Get an object containing date parts that can be used for the `YYYY-MM-DD` format, especially in
 * the local time zone.
 * @param {object} [options] Options.
 * @param {Date} [options.date] Date to use.
 * @param {string} [options.timeZone] Time zone, e.g. `UTC`.
 * @returns {{ [key: string]: string }} Result like `{ year: '2023', month: '01', day: '23', ... }`.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts
 */
const getDateTimeParts = ({ date = new Date(), timeZone = undefined } = {}) =>
  Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter(({ type }) => type in partOptions)
      .map(({ type, value }) => [type, type === 'hour' && value === '24' ? '00' : value]),
  );

export { getDateTimeParts };
