const { EventEmitter } = require('events');

const STATE = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' };

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.threshold = options.threshold ?? 5;
    this.timeout = options.timeout ?? 30000;
    this.state = STATE.CLOSED;
    this.failures = 0;
    this.lastFailureTime = null;
    this._timer = null;
  }

  isOpen() {
    if (this.state === STATE.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = STATE.HALF_OPEN;
        this.emit('half_open');
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    if (this.state !== STATE.CLOSED) {
      this.state = STATE.CLOSED;
      this.emit('close');
    }
  }

  recordFailure() {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = STATE.OPEN;
      this.emit('open', { failures: this.failures });
    }
  }

  getState() {
    return { state: this.state, failures: this.failures, lastFailureTime: this.lastFailureTime };
  }

  reset() {
    this.failures = 0;
    this.state = STATE.CLOSED;
    this.lastFailureTime = null;
  }
}

function createCircuitBreaker(options) {
  return new CircuitBreaker(options);
}

module.exports = { CircuitBreaker, createCircuitBreaker, STATE };
