 /** Ollama Cache Module --> **/
/**
 * Ollama Cache Utility
 * 
 * Browser-compatible caching system for Ollama AI responses using IndexedDB.
 * Provides persistent cache across page reloads with automatic cache key generation.
 */

const OllamaCache = (() => {
      const DB_NAME = 'OllamaCacheDB';
      const STORE_NAME = 'responses';
      const DB_VERSION = 1;

      let dbInstance = null;

      /**
       * Initialize IndexedDB database
       */
      async function initDB() {
        if (dbInstance) {
          return dbInstance;
        }

        return new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error);
            reject(request.error);
          };

          request.onsuccess = () => {
            dbInstance = request.result;
            console.log('✅ IndexedDB initialized successfully');
            resolve(dbInstance);
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
              objectStore.createIndex('timestamp', 'timestamp', { unique: false });
              console.log('📦 Created object store:', STORE_NAME);
            }
          };
        });
      }

      /**
       * Generate a cache key from model, messages, and options
       */
      function generateCacheKey(model, messages, options = {}) {
        // Create a stable representation of the request
        const cacheData = {
          model,
          messages,
          think: options.think ?? false,
          // Don't include stream in cache key - only cache non-streaming responses
        };

        const dataString = JSON.stringify(cacheData);
        
        // Use SubtleCrypto API for hashing (async version for browser)
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataString))
          .then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
          });
      }

      /**
       * Get cached response from IndexedDB
       */
      async function get(cacheKey) {
        const db = await initDB();

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const objectStore = transaction.objectStore(STORE_NAME);
          const request = objectStore.get(cacheKey);

          request.onerror = () => {
            console.error('Error reading from cache:', request.error);
            reject(request.error);
          };

          request.onsuccess = () => {
            const result = request.result;
            if (result) {
              console.log('⚡ Cache HIT! Using stored response');
              resolve(result.response);
            } else {
              console.log('🔍 Cache MISS. Will fetch from Ollama...');
              resolve(null);
            }
          };
        });
      }

      /**
       * Store response in IndexedDB cache
       */
      async function set(cacheKey, response) {
        const db = await initDB();

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const objectStore = transaction.objectStore(STORE_NAME);
          
          const cacheEntry = {
            cacheKey,
            response,
            timestamp: Date.now()
          };

          const request = objectStore.put(cacheEntry);

          request.onerror = () => {
            console.error('Error writing to cache:', request.error);
            reject(request.error);
          };

          request.onsuccess = () => {
            console.log('💾 Response cached successfully');
            resolve();
          };
        });
      }

      /**
       * Clear all cached responses
       */
      async function clear() {
        const db = await initDB();

        return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const objectStore = transaction.objectStore(STORE_NAME);
          const request = objectStore.clear();

          request.onerror = () => {
            console.error('Error clearing cache:', request.error);
            reject(request.error);
          };

          request.onsuccess = () => {
            console.log('🗑️ Cache cleared successfully');
            resolve();
          };
        });
      }

      // Public API
      return {
        initDB,
        generateCacheKey,
        get,
        set,
        clear
      };
    })();