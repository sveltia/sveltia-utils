/**
 * Type definitions for new standard methods not yet included in TypeScript's built-in types.
 */

interface Uint8ArrayConstructor {
  /**
   * Creates a new Uint8Array from a base64-encoded string.
   * @param base64 - A base64-encoded string.
   * @param options - Options for decoding.
   * @returns A new Uint8Array containing the decoded bytes.
   */
  fromBase64(base64: string, options?: { alphabet?: 'base64' | 'base64url' }): Uint8Array;
}

interface Uint8Array {
  /**
   * Converts the Uint8Array to a base64-encoded string.
   * @param options - Options for encoding.
   * @returns A base64-encoded string.
   */
  toBase64(options?: { alphabet?: 'base64' | 'base64url' }): string;
}
