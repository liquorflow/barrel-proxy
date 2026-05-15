const { EventEmitter } = require('events');

class ResponseSizeGuard extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxBytes = options.maxBytes || 10 * 1024 * 1024; // 10MB default
    this.warnBytes = options.warnBytes || null;
    this.stats = { checked: 0, blocked: 0, warned: 0 };
  }

  check(contentLength) {
    this.stats.checked++;

    if (contentLength === null || contentLength === undefined) {
      return { allowed: true, reason: 'unknown' };
    }

    const bytes = parseInt(contentLength, 10);

    if (isNaN(bytes)) {
      return { allowed: true, reason: 'unparseable' };
    }

    if (bytes > this.maxBytes) {
      this.stats.blocked++;
      this.emit('blocked', { bytes, maxBytes: this.maxBytes });
      return { allowed: false, bytes, maxBytes: this.maxBytes, reason: 'exceeded' };
    }

    if (this.warnBytes && bytes > this.warnBytes) {
      this.stats.warned++;
      this.emit('warn', { bytes, warnBytes: this.warnBytes });
    }

    return { allowed: true, bytes, reason: 'ok' };
  }

  getStats() {
    return { ...this.stats };
  }
}

function createResponseSizeGuard(options = {}) {
  return new ResponseSizeGuard(options);
}

module.exports = { ResponseSizeGuard, createResponseSizeGuard };
