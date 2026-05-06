const { EventEmitter } = require('events');

class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.windowMs = options.windowMs || 60000;
    this.max = options.max || 100;
    this.store = new Map();
  }

  check(key) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count += 1;
    const allowed = entry.count <= this.max;
    const remaining = Math.max(0, this.max - entry.count);

    if (!allowed) {
      this.emit('exceeded', { key, count: entry.count });
    }

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  getStats() {
    const stats = {};
    for (const [key, entry] of this.store.entries()) {
      stats[key] = { count: entry.count, resetAt: entry.resetAt };
    }
    return stats;
  }

  reset(key) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

function createRateLimiter(options = {}) {
  return new RateLimiter(options);
}

module.exports = { RateLimiter, createRateLimiter };
