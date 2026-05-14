const { EventEmitter } = require('events');

class IpFilter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.allowList = options.allow ? options.allow.map(normalizeEntry) : null;
    this.denyList = options.deny ? options.deny.map(normalizeEntry) : [];
    this.hits = 0;
    this.blocks = 0;
  }

  isAllowed(ip) {
    if (this.denyList.some(entry => matchIp(ip, entry))) {
      this.blocks++;
      this.emit('blocked', { ip });
      return false;
    }
    if (this.allowList !== null && !this.allowList.some(entry => matchIp(ip, entry))) {
      this.blocks++;
      this.emit('blocked', { ip });
      return false;
    }
    this.hits++;
    this.emit('allowed', { ip });
    return true;
  }

  stats() {
    return { hits: this.hits, blocks: this.blocks };
  }
}

function normalizeEntry(entry) {
  if (typeof entry === 'string' && entry.includes('/')) {
    const [base, bits] = entry.split('/');
    return { type: 'cidr', base, bits: parseInt(bits, 10) };
  }
  return { type: 'exact', value: entry };
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function matchIp(ip, entry) {
  if (entry.type === 'exact') return ip === entry.value;
  if (entry.type === 'cidr') {
    try {
      const mask = ~((1 << (32 - entry.bits)) - 1) >>> 0;
      return (ipToInt(ip) & mask) === (ipToInt(entry.base) & mask);
    } catch {
      return false;
    }
  }
  return false;
}

function createIpFilter(options = {}) {
  return new IpFilter(options);
}

module.exports = { IpFilter, createIpFilter };
