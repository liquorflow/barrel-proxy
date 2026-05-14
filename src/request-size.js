const { EventEmitter } = require('events');

class RequestSizeGuard extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxBytes = options.maxBytes ?? 1024 * 1024; // 1MB default
    this.blocked = 0;
    this.allowed = 0;
  }

  check(req) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > this.maxBytes) {
      this.blocked++;
      this.emit('blocked', { contentLength, maxBytes: this.maxBytes, url: req.url });
      return false;
    }
    this.allowed++;
    this.emit('allowed', { contentLength, url: req.url });
    return true;
  }

  stats() {
    return {
      maxBytes: this.maxBytes,
      blocked: this.blocked,
      allowed: this.allowed,
    };
  }

  reset() {
    this.blocked = 0;
    this.allowed = 0;
  }
}

function createRequestSizeGuard(options = {}) {
  return new RequestSizeGuard(options);
}

module.exports = { RequestSizeGuard, createRequestSizeGuard };
