const { EventEmitter } = require('events');

class ResponseCache extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxAge = options.maxAge || 5000; // ms
    this.maxSize = options.maxSize || 100;
    this._store = new Map();
  }

  _key(req) {
    return `${req.method}:${req.url}`;
  }

  get(req) {
    const key = this._key(req);
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.maxAge) {
      this._store.delete(key);
      return null;
    }
    this.emit('hit', key);
    return entry;
  }

  set(req, status, headers, body) {
    if (this._store.size >= this.maxSize) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }
    const key = this._key(req);
    this._store.set(key, { status, headers, body, timestamp: Date.now() });
    this.emit('set', key);
  }

  invalidate(pattern) {
    for (const key of this._store.keys()) {
      if (!pattern || key.includes(pattern)) {
        this._store.delete(key);
      }
    }
    this.emit('invalidate', pattern);
  }

  size() {
    return this._store.size;
  }

  clear() {
    this._store.clear();
    this.emit('clear');
  }
}

function createCache(options) {
  return new ResponseCache(options);
}

module.exports = { ResponseCache, createCache };
