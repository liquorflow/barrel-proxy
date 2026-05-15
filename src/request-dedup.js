/**
 * Request deduplication — collapses identical in-flight requests
 * into a single upstream call and fans the response out to all waiters.
 */
'use strict';

const { EventEmitter } = require('events');

class RequestDedup extends EventEmitter {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl ?? 5000; // max ms to hold an in-flight entry
    this._inflight = new Map();
  }

  /**
   * Returns true if a request with this key is already in-flight.
   */
  has(key) {
    return this._inflight.has(key);
  }

  /**
   * Register a new in-flight request. Returns the shared promise.
   * @param {string} key
   * @param {() => Promise<any>} fn  factory that performs the actual request
   */
  register(key, fn) {
    if (this._inflight.has(key)) {
      this.emit('dedup', key);
      return this._inflight.get(key).promise;
    }

    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    const timer = setTimeout(() => {
      this._inflight.delete(key);
      reject(new Error(`Dedup TTL expired for key: ${key}`));
    }, this.ttl);

    this._inflight.set(key, { promise, resolve, reject, timer });

    fn()
      .then((value) => {
        clearTimeout(timer);
        this._inflight.delete(key);
        this.emit('hit', key);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        this._inflight.delete(key);
        this.emit('error', err, key);
        reject(err);
      });

    return promise;
  }

  /**
   * Number of currently in-flight deduplicated requests.
   */
  get size() {
    return this._inflight.size;
  }

  clear() {
    for (const { timer, reject } of this._inflight.values()) {
      clearTimeout(timer);
      reject(new Error('Dedup cleared'));
    }
    this._inflight.clear();
  }
}

function createRequestDedup(options = {}) {
  return new RequestDedup(options);
}

module.exports = { RequestDedup, createRequestDedup };
