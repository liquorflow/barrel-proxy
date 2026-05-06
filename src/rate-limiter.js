const { EventEmitter } = require('events');

class RateLimiter extends EventEmitter {
  constructor({ windowMs = 60000, max = 100 } = {}) {
    super();
    this.windowMs = windowMs;
    this.max = max;
    this.buckets = new Map();
  }

  _cleanup(key) {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket) return;
    bucket.requests = bucket.requests.filter(t => now - t < this.windowMs);
    if (bucket.requests.length === 0) this.buckets.delete(key);
  }

  hit(key) {
    this._cleanup(key);
    const now = Date.now();
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { requests: [] });
    }
    const bucket = this.buckets.get(key);
    bucket.requests.push(now);
    const count = bucket.requests.length;
    const allowed = count <= this.max;
    if (!allowed) {
      this.emit('limited', { key, count });
    }
    return { allowed, count, remaining: Math.max(0, this.max - count) };
  }

  reset(key) {
    this.buckets.delete(key);
  }

  clear() {
    this.buckets.clear();
  }
}

function createRateLimiter(options = {}) {
  return new RateLimiter(options);
}

module.exports = { RateLimiter, createRateLimiter };
