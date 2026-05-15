const { EventEmitter } = require('events');

class RequestQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 10;
    this.timeout = options.timeout || 30000;
    this.active = 0;
    this.queue = [];
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      const entry = { task, resolve, reject, enqueuedAt: Date.now() };
      this.queue.push(entry);
      this.emit('queued', { queueLength: this.queue.length });
      this._drain();
    });
  }

  _drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const entry = this.queue.shift();
      const waited = Date.now() - entry.enqueuedAt;
      if (waited >= this.timeout) {
        entry.reject(Object.assign(new Error('Request queue timeout'), { code: 'QUEUE_TIMEOUT' }));
        this.emit('timeout', { waited });
        continue;
      }
      this.active++;
      this.emit('active', { active: this.active, queueLength: this.queue.length });
      Promise.resolve()
        .then(() => entry.task())
        .then(entry.resolve, entry.reject)
        .finally(() => {
          this.active--;
          this.emit('done', { active: this.active, queueLength: this.queue.length });
          this._drain();
        });
    }
  }

  get pending() {
    return this.queue.length;
  }

  stats() {
    return { active: this.active, pending: this.queue.length, concurrency: this.concurrency };
  }
}

function createRequestQueue(options) {
  return new RequestQueue(options);
}

module.exports = { RequestQueue, createRequestQueue };
