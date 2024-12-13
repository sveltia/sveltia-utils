import base32Encode from 'base32-encode';

/**
 * Regular expression that matches a UUID.
 */
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/**
 * Generate a v4 UUID or its shortened version.
 * @param {'short' | 'shorter' | number} [length] - Length.
 * @returns {string} UUID like `10f95178-c983-4cfe-91d6-4e62c8c7e582`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
 */
const generateUUID = (length) => {
  const uuid = /** @type {string} */ globalThis.crypto.randomUUID();

  // Last 12 characters
  if (length === 'short') {
    return /** @type {string} */ (uuid.split('-').pop());
  }

  // First 8 characters
  if (length === 'shorter') {
    return /** @type {string} */ (uuid.split('-').shift());
  }

  // First X characters but without hyphens
  if (typeof length === 'number') {
    return uuid.split('-').join('').slice(0, length);
  }

  return uuid;
};

/**
 * Generate a random ID.
 * @returns {string} Generated 26-character string.
 */
const generateRandomId = () => {
  const hex = generateUUID().replaceAll('-', '');
  const { buffer } = new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));

  return base32Encode(buffer, 'RFC4648', { padding: false }).toLowerCase();
};

/**
 * Get the SHA hash of the given file or text.
 * @param {File | Blob | string} input - File or text.
 * @param {object} [options] - Options.
 * @param {'SHA-1' | 'SHA-256' | 'SHA-512'} [options.algorithm] - Digest algorithm. Default: SHA-1.
 * @param {'hex' | 'binary'} [options.format] - Hash format. Default: hex.
 * @returns {Promise<string>} Hash.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 */
const getHash = async (input, { algorithm = 'SHA-1', format = 'hex' } = {}) => {
  const data =
    typeof input === 'string' ? new TextEncoder().encode(input) : await input.arrayBuffer();

  const digest = await globalThis.crypto.subtle.digest(algorithm, data);

  if (format === 'binary') {
    return Array.from(new Uint8Array(digest), (b) => String.fromCharCode(b)).join('');
  }

  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

export { generateRandomId, generateUUID, getHash, uuidPattern };
