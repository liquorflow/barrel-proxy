const { EventEmitter } = require('events');
const crypto = require('crypto');

class StickySessionRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cookieName = options.cookieName || 'barrel_sticky';
    this.ttl = options.ttl || 3600000; // 1 hour
    this.sessions = new Map();
    this._pruneInterval = setInterval(() => this._prune(), 60000);
    this._pruneInterval.unref();
  }

  getTarget(sessionId) {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    entry.expiresAt = Date.now() + this.ttl;
    return entry.target;
  }

  bind(sessionId, target) {
    this.sessions.set(sessionId, {
      target,
      expiresAt: Date.now() + this.ttl,
    });
    this.emit('bind', { sessionId, target });
  }

  release(sessionId) {
    const had = this.sessions.has(sessionId);
    this.sessions.delete(sessionId);
    if (had) this.emit('release', { sessionId });
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  _prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [id, entry] of this.sessions) {
      if (now > entry.expiresAt) {
        this.sessions.delete(id);
        pruned++;
      }
    }
    if (pruned > 0) this.emit('prune', { count: pruned });
  }

  stop() {
    clearInterval(this._pruneInterval);
    this.sessions.clear();
  }
}

function createStickySessionRouter(options = {}) {
  return new StickySessionRouter(options);
}

module.exports = { StickySessionRouter, createStickySessionRouter };
