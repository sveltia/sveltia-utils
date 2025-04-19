/**
 * Return a simple `Promise` to resolve in the given time, making it easier to wait for a bit in the
 * code, particularly while making sequential HTTP requests.
 * @param {number} [ms] - Milliseconds to wait.
 * @returns {Promise<void>} Nothing.
 */
const sleep = (ms = 0) =>
  new Promise((resolve) => {
    globalThis.setTimeout(() => {
      resolve(void 0);
    }, ms);
  });

export { sleep };
