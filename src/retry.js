const { EventEmitter } = require('events');

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY = 200;

function defaultShouldRetry(error) {
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

class RetryHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.delay = options.delay ?? DEFAULT_DELAY;
    this.shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  }

  getConfig() {
    return { maxAttempts: this.maxAttempts, delay: this.delay };
  }

  async execute(fn) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxAttempts && this.shouldRetry(err)) {
          this.emit('retry', { attempt, error: err });
          await this._wait(this.delay * attempt);
        } else {
          break;
        }
      }
    }
    this.emit('exhausted', { error: lastError, maxAttempts: this.maxAttempts });
    throw lastError;
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function createRetryHandler(options = {}) {
  return new RetryHandler(options);
}

module.exports = { RetryHandler, createRetryHandler };
