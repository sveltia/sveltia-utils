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
  'image/svg+xml',
];

/**
 * Whether the given MIME type is plaintext.
 * @param {string} type - MIME type.
 * @returns {boolean} Result.
 */
export const isTextFileType = (type) => type.startsWith('text/') || textFileTypes.includes(type);

/**
 * Scan local files in nested folders and return them in a flat array, sorted by name.
 * @param {DataTransfer} dataTransfer - From `drop` event.
 * @param {object} [options] - Options.
 * @param {string} [options.accept] - Accepted file types, which is the same as the `accept`
 * property for HTML `<input type="file">`.
 * @returns {Promise<File[]>} Files.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
 */
export const scanFiles = async ({ items }, { accept } = {}) => {
  const fileTypes = accept ? accept.trim().split(/,\s*/g) : [];

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
            const isValidType =
              !fileTypes.length ||
              fileTypes.some((mimeType) => {
                const [type, subtype] = mimeType.split('/');

                return subtype === '*' ? file.type.split('/')[0] === type : file.type === mimeType;
              });

            resolve(isValidType ? file : null);
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
export const readAsText = async (file) => (await file.text()).replace(/\r\n/g, '\n');

/**
 * Get the Base64 encoding of the given input.
 * @param {File | Blob | string} input - Input file or string.
 * @returns {Promise<string>} Data URL like `data:text/plain;base64,...`.
 */
export const getDataURL = async (input) => {
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
 * Get the data URL of the given input.
 * @param {File | Blob | string} input - Input file or string.
 * @returns {Promise<string>} Base64.
 */
export const getBase64 = async (input) => (await getDataURL(input)).split(',')[1];

/**
 * Save the given file locally.
 * @param {File | Blob} file - File to be saved.
 * @param {string} [name] - File name. Required if the `file` param is a `Blob`.
 */
export const saveFile = (file, name) => {
  const link = document.createElement('a');
  const blobURL = URL.createObjectURL(file);

  link.download =
    name ?? /** @type {File} */ (file).name ?? `${Date.now()}.${file.type.split('/')[1]}`;
  link.href = blobURL;
  link.click();

  URL.revokeObjectURL(blobURL);
};
