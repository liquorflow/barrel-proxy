const { EventEmitter } = require('events');

const DEFAULT_TIMEOUT_MS = 30000;

class TimeoutHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.timeouts = 0;
    this.total = 0;
  }

  wrap(fn) {
    return (...args) => {
      this.total++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.timeouts++;
          this.emit('timeout', { timeoutMs: this.timeoutMs });
          const err = new Error(`Request timed out after ${this.timeoutMs}ms`);
          err.code = 'ETIMEOUT';
          reject(err);
        }, this.timeoutMs);

        Promise.resolve(fn(...args))
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };
  }

  stats() {
    return {
      total: this.total,
      timeouts: this.timeouts,
      timeoutMs: this.timeoutMs,
    };
  }
}

function createTimeoutHandler(options = {}) {
  return new TimeoutHandler(options);
}

module.exports = { TimeoutHandler, createTimeoutHandler };
