/* eslint-disable jsdoc/require-jsdoc */

/**
 * Arguments to be passed to `IDBObjectStore.createIndex()`.
 * @typedef {object} DatabaseIndex
 * @property {string} name Index name.
 * @property {string | string[]} keyPath Key path(s).
 * @property {IDBIndexParameters} [options] Index options.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/createIndex#parameters
 */

/**
 * Implement a wrapper for the IndexedDB API, making it easier to use the client-side database with
 * auto-upgrades and convenient Promise methods.
 */
export default class IndexedDB {
  /**
   * Database itself.
   * @type {IDBDatabase | undefined}
   */
  #database;

  /**
   * Database name in use.
   * @type {string}
   */
  #databaseName = '';

  /**
   * Store name in use.
   * @type {string}
   */
  #storeName = '';

  /**
   * Store options to be passed to `IDBDatabase.createObjectStore()`. Note that this cannot be
   * altered after the store is created.
   * @type {IDBObjectStoreParameters}
   */
  #storeOptions = {};

  /**
   * Index options to be passed to `IDBObjectStore.createIndex()`.
   * @type {DatabaseIndex[]}
   */
  #indexes = [];

  /**
   * Initialize a new `IndexedDB` instance.
   * @param {string} databaseName - Database name.
   * @param {string} storeName - Store name.
   * @param {object} [options] - Options.
   * @param {string | string[]} [options.keyPath] - Option for `createObjectStore()`.
   * @param {boolean} [options.autoIncrement] - Option for `createObjectStore()`.
   * @param {DatabaseIndex[]} [options.indexes] - Arguments for `createIndex()`.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore
   * @see https://stackoverflow.com/questions/33852508/how-to-create-an-indexeddb-composite-key
   */
  constructor(databaseName, storeName, { keyPath, autoIncrement, indexes = [] } = {}) {
    this.#database = undefined;
    this.#databaseName = databaseName;
    this.#storeName = storeName;
    this.#storeOptions = { keyPath, autoIncrement };
    this.#indexes = indexes;
  }

  /**
   * Open the database and create a store if needed.
   * @param {number} [version] - Database version.
   * @returns {Promise<IDBDatabase>} Database.
   */
  async #openDatabase(version) {
    return new Promise((resolve) => {
      const request = globalThis.indexedDB.open(this.#databaseName, version);

      request.onupgradeneeded = () => {
        const database = request.result;
        const storeName = this.#storeName;

        const store = database.objectStoreNames.contains(storeName)
          ? database.transaction(storeName, 'readwrite').objectStore(storeName)
          : database.createObjectStore(storeName, this.#storeOptions);

        this.#indexes.forEach(({ name, keyPath, options }) => {
          if (!store.indexNames.contains(name)) {
            store.createIndex(name, keyPath, options);
          }
        });
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Get the database and automatically upgrade it if a new store is not created yet.
   * @returns {Promise<IDBDatabase>} Database.
   */
  async #getDatabase() {
    let upgradeNeeded = false;
    let database = await this.#openDatabase();
    const { version, objectStoreNames } = database;
    const storeName = this.#storeName;

    if (objectStoreNames.contains(storeName)) {
      const store = database.transaction(storeName).objectStore(storeName);

      upgradeNeeded = this.#indexes.some(({ name }) => !store.indexNames.contains(name));
    } else {
      upgradeNeeded = true;
    }

    if (upgradeNeeded) {
      database.close();
      database = await this.#openDatabase(version + 1);
    }

    // Avoid upgrade conflict
    database.onversionchange = () => {
      database.close();
      this.#database = undefined;
    };

    return database;
  }

  /**
   * Create a database if not yet initialized, then execute the given function over the store.
   * @param {(store: IDBObjectStore) => IDBRequest | void} getRequest - Function to be executed.
   * @returns {Promise<any | void>} Result.
   */
  async #query(getRequest) {
    this.#database ??= await this.#getDatabase();

    const database = /** @type {IDBDatabase} */ (this.#database);
    const storeName = this.#storeName;
    const transaction = database.transaction(storeName, 'readwrite');
    const request = getRequest(transaction.objectStore(storeName));

    if (request) {
      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        resolve(void 0);
      };
    });
  }

  /**
   * Save a value with an out-of-line key.
   * @param {any} key - Key.
   * @param {any} value - Value.
   * @returns {Promise<any>} Key.
   */
  async set(key, value) {
    return this.#query((store) => store.put(value, key));
  }

  /**
   * Save a value with an inline key.
   * @param {any} value - Value.
   * @returns {Promise<any>} Key.
   */
  async put(value) {
    return this.#query((store) => store.put(value));
  }

  /**
   * Save multiple records.
   * @param {[any, any][]} records - Key/value pairs.
   * @returns {Promise<any>} Key.
   */
  async saveEntries(records) {
    return this.#query((store) => {
      records.forEach(([key, value]) => {
        store.put(value, key);
      });
    });
  }

  /**
   * Retrieve a value by key.
   * @param {any} key - Key.
   * @returns {Promise<any>} Value.
   */
  async get(key) {
    return this.#query((store) => store.get(key));
  }

  /**
   * Retrieve all the keys.
   * @returns {Promise<any[]>} Keys.
   */
  async keys() {
    return this.#query((store) => store.getAllKeys());
  }

  /**
   * Retrieve all the values.
   * @returns {Promise<any[]>} Values.
   */
  async values() {
    return this.#query((store) => store.getAll());
  }

  /**
   * Retrieve all the records.
   * @returns {Promise<[any, any][]>} Key/value pairs.
   */
  async entries() {
    const [keys, values] = await Promise.all([this.keys(), this.values()]);

    return keys.map((key, index) => [key, values[index]]);
  }

  /**
   * Find one or more records using a cursor.
   * @param {object} args - Arguments.
   * @param {(record: any) => boolean} [args.callback] - A function to execute for each record.
   * @param {string} [args.index] - Index name.
   * @param {IDBValidKey | IDBKeyRange} [args.query] - Query option for `openCursor()`.
   * @param {IDBCursorDirection} [args.direction] - The direction option for `openCursor()`.
   * @param {boolean} [args.multiple] - Whether to return all matching records.
   * @returns {Promise<any | any[]>} Found record(s).
   */
  async #search({
    callback = undefined,
    index = undefined,
    query = undefined,
    direction = 'next',
    multiple = false,
  }) {
    return new Promise((resolve) => {
      this.#query((store) => {
        const request = (index ? store.index(index) : store).openCursor(query, direction);
        /** @type {any[]} */
        const records = [];

        request.onsuccess = () => {
          const cursor = request.result;

          if (cursor) {
            const { value } = cursor;

            if (typeof callback === 'function' ? callback(value) : true) {
              if (multiple) {
                records.push(value);
                cursor.continue();
              } else {
                resolve(value);
              }
            } else {
              cursor.continue();
            }
          } else {
            resolve(multiple ? records : undefined);
          }
        };
      });
    });
  }

  /**
   * Find the first record that matches the condition.
   * @param {(record: any) => boolean} [callback] - A function to execute for each record.
   * @param {object} [options] - Options.
   * @param {string} [options.index] - Index.
   * @param {IDBValidKey | IDBKeyRange} [options.query] - Query option for `openCursor()`.
   * @returns {Promise<any>} Found record.
   */
  async find(callback, { index, query } = {}) {
    return this.#search({ callback, index, query });
  }

  /**
   * Find the last record that matches the condition.
   * @param {(record: any) => boolean} [callback] - A function to execute for each record.
   * @param {object} [options] - Options.
   * @param {string} [options.index] - Index.
   * @param {IDBValidKey | IDBKeyRange} [options.query] - Query option for `openCursor()`.
   * @returns {Promise<any>} Found record.
   */
  async findLast(callback, { index, query } = {}) {
    return this.#search({ callback, index, query, direction: 'prev' });
  }

  /**
   * Find all the records that match the condition.
   * @param {(record: any) => boolean} [callback] - A function to execute for each record.
   * @param {object} [options] - Options.
   * @param {string} [options.index] - Index.
   * @param {IDBValidKey | IDBKeyRange} [options.query] - Query option for `openCursor()`.
   * @returns {Promise<any[]>} Found records.
   */
  async filter(callback, { index, query } = {}) {
    return this.#search({ callback, index, query, multiple: true });
  }

  /**
   * Delete an record by key.
   * @param {any} key - Key.
   * @returns {Promise<void>} Result.
   */
  async delete(key) {
    await this.#query((store) => store.delete(key));
  }

  /**
   * Delete multiple records by keys.
   * @param {any[]} keys - Property keys.
   * @returns {Promise<void>} Result.
   */
  async deleteEntries(keys) {
    await this.#query((store) => {
      keys.forEach((key) => {
        store.delete(key);
      });
    });
  }

  /**
   * Delete all the records.
   * @returns {Promise<void>} Result.
   */
  async clear() {
    await this.#query((store) => store.clear());
  }
}
