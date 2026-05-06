const { EventEmitter } = require('events');

class RequestStats extends EventEmitter {
  constructor() {
    super();
    this.counters = {};
    this.responseTimes = {};
    this.errors = {};
    this.startTime = Date.now();
  }

  record(serviceId, statusCode, durationMs) {
    if (!this.counters[serviceId]) {
      this.counters[serviceId] = { total: 0, byStatus: {} };
      this.responseTimes[serviceId] = [];
      this.errors[serviceId] = 0;
    }
    const s = this.counters[serviceId];
    s.total += 1;
    s.byStatus[statusCode] = (s.byStatus[statusCode] || 0) + 1;
    this.responseTimes[serviceId].push(durationMs);
    if (statusCode >= 500) this.errors[serviceId] += 1;
    this.emit('recorded', { serviceId, statusCode, durationMs });
  }

  avgResponseTime(serviceId) {
    const times = this.responseTimes[serviceId];
    if (!times || times.length === 0) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  summary() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const services = Object.keys(this.counters).map((id) => ({
      service: id,
      total: this.counters[id].total,
      byStatus: this.counters[id].byStatus,
      errors: this.errors[id],
      avgMs: this.avgResponseTime(id),
    }));
    return { uptime, services };
  }

  reset() {
    this.counters = {};
    this.responseTimes = {};
    this.errors = {};
    this.startTime = Date.now();
  }
}

function createStats() {
  return new RequestStats();
}

module.exports = { RequestStats, createStats };
