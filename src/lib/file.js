import { uuidPattern } from './crypto';
import { escapeRegExp } from './string';

/**
 * Get a regular expression that matches a blob URL.
 * @param {string} flags - Flags for `RegExp`.
 * @returns {RegExp} Regular expression.
 */
const getBlobRegex = (flags = '') =>
  new RegExp(
    `\\bblob:${escapeRegExp(globalThis.location.origin)}\\/${uuidPattern.source}\\b`,
    flags,
  );

/**
 * A regular expression to match a file path. Chained extensions of tarballs like `archive.tar.gz`
 * are treated as a special case.
 */
const filePathRegEx = /(?:(.+?)\/)?(([^/]+?)(?:\.((?:tar\.)?[a-zA-Z0-9]+))?)$/;

/**
 * List of MIME types that can be considered as plaintext.
 */
const textFileTypes = [
  'application/atom+xml',
  'application/javascript',
  'application/json',
  'application/ld+json',
  'application/rss+xml',
  'application/xhtml+xml',
  'application/xml',
  'application/yaml', // RFC 9512
  'image/svg+xml',
];

/**
 * Whether the given MIME type is plaintext.
 * @param {string} type - MIME type.
 * @returns {boolean} Result.
 */
const isTextFileType = (type) => type.startsWith('text/') || textFileTypes.includes(type);

/**
 * Get information about a file path.
 * @param {string} path - Path to be parsed.
 * @returns {{ dirname?: string, basename: string, filename: string, extension?: string }} Result.
 * @see https://www.php.net/manual/en/function.pathinfo.php
 */
const getPathInfo = (path) => {
  const [, dirname, basename, filename, extension] = path.match(filePathRegEx) ?? [];

  return { dirname, basename, filename, extension };
};

/**
 * Encode the given (partial) file path or file name. Since {@link encodeURIComponent} encodes
 * slashes, we need to split and join.
 * @param {string} path - Original path.
 * @returns {string} Encoded path.
 */
const encodeFilePath = (path) => path.split('/').map(encodeURIComponent).join('/');
/**
 * Encode the given (partial) file path or file name.
 * @param {string} path - Original path.
 * @returns {string} Decoded path.
 */
const decodeFilePath = (path) => decodeURIComponent(path);

/**
 * Check if the given file matches one of the unique file type specifiers.
 * @param {File} file - File to be evaluated.
 * @param {string[]} specifiers - List of file type specifiers.
 * @returns {boolean} Result.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept
 */
const isValidFileType = (file, specifiers) => {
  if (!specifiers.length) {
    return true;
  }

  return specifiers.some((specifier) => {
    if (specifier.startsWith('.')) {
      return file.name.endsWith(specifier);
    }

    const [type, subtype] = specifier.split('/');

    if (subtype === '*') {
      return file.type.split('/')[0] === type;
    }

    return file.type === specifier;
  });
};

/**
 * Scan local files in nested folders and return them in a flat array, sorted by name.
 * @param {DataTransfer} dataTransfer - From `drop` event.
 * @param {object} [options] - Options.
 * @param {string} [options.accept] - Accepted file types, which is the same as the `accept`
 * property for HTML `<input type="file">`.
 * @returns {Promise<File[]>} Files.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
 */
const scanFiles = async ({ items }, { accept } = {}) => {
  const specifiers = accept ? accept.trim().split(/,\s*/) : [];

  /**
   * Read files recursively from the filesystem.
   * @param {FileSystemEntry} entry - Either a file or
   * directory entry.
   * @returns {Promise<File | File[] | null>} File.
   */
  const readEntry = (entry) =>
    new Promise((resolve) => {
      // Skip hidden files
      if (entry.name.startsWith('.')) {
        resolve(null);
      } else if (entry.isFile) {
        /** @type {FileSystemFileEntry} */ (entry).file(
          (file) => {
            resolve(isValidFileType(file, specifiers) ? file : null);
          },
          // Skip inaccessible files
          () => {
            resolve(null);
          },
        );
      } else {
        /** @type {FileSystemDirectoryEntry} */ (entry).createReader().readEntries((entries) => {
          resolve(/** @type {Promise<File[]>} */ (Promise.all(entries.map(readEntry))));
        });
      }
    });

  return /** @type {File[]} */ (
    (
      await Promise.all(
        [...items].map((item) => {
          const entry = item.webkitGetAsEntry();

          return entry ? readEntry(entry) : null;
        }),
      )
    )
      .flat(100000)
      .filter(Boolean)
  ).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Read the given file as plaintext. On Windows, the result may include CRLF line breaks. Convert
 * any CRLF to LF to parse entries properly.
 * @param {File | Blob} file - File.
 * @returns {Promise<string>} Content.
 */
const readAsText = async (file) => (await file.text()).replace(/\r\n/g, '\n');

/**
 * Get the data URL of the given input.
 * @param {File | Blob | string} input - Input file or string.
 * @returns {Promise<string>} Data URL like `data:text/plain;base64,...`.
 */
const getDataURL = async (input) => {
  const blob = typeof input === 'string' ? new Blob([input], { type: 'text/plain' }) : input;
  const reader = new FileReader();

  return new Promise((resolve) => {
    /**
     * Return the result once the content is read.
     */
    reader.onload = () => {
      resolve(/** @type {string} */ (reader.result));
    };

    reader.readAsDataURL(blob);
  });
};

/**
 * Encode the given input, either a file or a string, as a Base64-encoded string.
 * @param {File | Blob | string} input - Input file or string.
 * @returns {Promise<string>} Base64.
 */
const encodeBase64 = async (input) => (await getDataURL(input)).split(',')[1];

/**
 * Decode a Base64-encoded string as a plaintext UTF-8 string. Uses `Promise` to be consistent with
 * {@link encodeBase64}.
 * @param {string} base64 - Base64-encoded string.
 * @returns {Promise<string>} Decoded string.
 * @see https://stackoverflow.com/q/21797299
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
 */
const decodeBase64 = async (base64) => {
  const buffer =
    Uint8Array.fromBase64?.(base64) ?? Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  return new TextDecoder().decode(buffer);
};

/**
 * Save the given file locally.
 * @param {File | Blob} file - File to be saved.
 * @param {string} [name] - File name. Required if the `file` param is a `Blob`.
 */
const saveFile = (file, name) => {
  const link = document.createElement('a');
  const blobURL = URL.createObjectURL(file);

  link.download =
    name ?? /** @type {File} */ (file).name ?? `${Date.now()}.${file.type.split('/')[1]}`;
  link.href = blobURL;
  link.click();

  URL.revokeObjectURL(blobURL);
};

export {
  decodeBase64,
  decodeFilePath,
  encodeBase64,
  encodeFilePath,
  getBlobRegex,
  getDataURL,
  getPathInfo,
  isTextFileType,
  isValidFileType,
  readAsText,
  saveFile,
  scanFiles,
};
