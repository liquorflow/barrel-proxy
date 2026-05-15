'use strict';

const { EventEmitter } = require('events');

class AccessLog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.enabled = options.enabled !== false;
    this.format = options.format || 'combined';
    this.excludePaths = options.excludePaths || [];
    this.entries = [];
    this.maxEntries = options.maxEntries || 1000;
  }

  shouldLog(path) {
    if (!this.enabled) return false;
    return !this.excludePaths.some(p => path.startsWith(p));
  }

  record(entry) {
    const record = {
      timestamp: new Date().toISOString(),
      method: entry.method,
      path: entry.path,
      status: entry.status,
      duration: entry.duration,
      bytes: entry.bytes || 0,
      ip: entry.ip || '-',
      userAgent: entry.userAgent || '-',
      service: entry.service || '-',
      requestId: entry.requestId || '-',
    };
    this.entries.push(record);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    this.emit('entry', record);
    return record;
  }

  format_combined(entry) {
    return `${entry.ip} - [${entry.timestamp}] "${entry.method} ${entry.path}" ${entry.status} ${entry.bytes} "${entry.userAgent}" ${entry.duration}ms`;
  }

  format_short(entry) {
    return `${entry.method} ${entry.path} ${entry.status} ${entry.duration}ms`;
  }

  formatEntry(entry) {
    if (this.format === 'short') return this.format_short(entry);
    return this.format_combined(entry);
  }

  getEntries({ limit = 100, service, status } = {}) {
    let results = this.entries.slice();
    if (service) results = results.filter(e => e.service === service);
    if (status) results = results.filter(e => e.status === status);
    return results.slice(-limit);
  }

  clear() {
    this.entries = [];
    this.emit('cleared');
  }
}

function createAccessLog(options = {}) {
  return new AccessLog(options);
}

module.exports = { AccessLog, createAccessLog };
