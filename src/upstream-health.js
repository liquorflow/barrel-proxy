const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');

class UpstreamHealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.interval = options.interval || 10000;
    this.timeout = options.timeout || 3000;
    this.threshold = options.threshold || 2;
    this._timers = new Map();
    this._failures = new Map();
    this._status = new Map();
  }

  watch(name, target) {
    this._failures.set(name, 0);
    this._status.set(name, 'unknown');
    const timer = setInterval(() => this._probe(name, target), this.interval);
    timer.unref();
    this._timers.set(name, timer);
    this._probe(name, target);
  }

  unwatch(name) {
    const timer = this._timers.get(name);
    if (timer) clearInterval(timer);
    this._timers.delete(name);
    this._failures.delete(name);
    this._status.delete(name);
  }

  getStatus(name) {
    return this._status.get(name) || 'unknown';
  }

  getAllStatus() {
    const result = {};
    for (const [name, status] of this._status) result[name] = status;
    return result;
  }

  _probe(name, target) {
    const url = new URL(target);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(target, { timeout: this.timeout }, (res) => {
      res.resume();
      const ok = res.statusCode < 500;
      this._record(name, ok);
    });
    req.on('error', () => this._record(name, false));
    req.on('timeout', () => { req.destroy(); this._record(name, false); });
  }

  _record(name, ok) {
    const prev = this._status.get(name);
    if (ok) {
      this._failures.set(name, 0);
      if (prev !== 'healthy') {
        this._status.set(name, 'healthy');
        this.emit('healthy', name);
        this.emit('change', name, 'healthy');
      }
    } else {
      const failures = (this._failures.get(name) || 0) + 1;
      this._failures.set(name, failures);
      if (failures >= this.threshold && prev !== 'unhealthy') {
        this._status.set(name, 'unhealthy');
        this.emit('unhealthy', name);
        this.emit('change', name, 'unhealthy');
      }
    }
  }

  stop() {
    for (const [name] of this._timers) this.unwatch(name);
  }
}

function createUpstreamHealthMonitor(options) {
  return new UpstreamHealthMonitor(options);
}

module.exports = { UpstreamHealthMonitor, createUpstreamHealthMonitor };
