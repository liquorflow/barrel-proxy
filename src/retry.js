"use strict";

const { EventEmitter } = require("events");

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 2000,
  backoffFactor: 2,
  retryOn: [502, 503, 504],
};

class RetryHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.attempts = new Map();
  }

  shouldRetry(statusCode) {
    return this.options.retryOn.includes(statusCode);
  }

  getDelay(attempt) {
    const delay =
      this.options.initialDelay *
      Math.pow(this.options.backoffFactor, attempt - 1);
    return Math.min(delay, this.options.maxDelay);
  }

  getAttempts(requestId) {
    return this.attempts.get(requestId) || 0;
  }

  increment(requestId) {
    const current = this.getAttempts(requestId);
    this.attempts.set(requestId, current + 1);
    return current + 1;
  }

  canRetry(requestId) {
    return this.getAttempts(requestId) < this.options.maxAttempts;
  }

  clear(requestId) {
    this.attempts.delete(requestId);
  }

  reset() {
    this.attempts.clear();
  }
}

function createRetryHandler(options = {}) {
  return new RetryHandler(options);
}

module.exports = { RetryHandler, createRetryHandler, DEFAULT_OPTIONS };
