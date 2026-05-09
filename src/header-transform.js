const { EventEmitter } = require('events');

class HeaderTransformer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.set = options.set || {};
    this.remove = options.remove || [];
    this.forward = options.forward !== false;
  }

  applyToRequest(headers, clientIp) {
    const out = { ...headers };

    if (this.forward) {
      const existing = out['x-forwarded-for'];
      out['x-forwarded-for'] = existing ? `${existing}, ${clientIp}` : clientIp;
      out['x-forwarded-host'] = out['host'] || '';
      out['x-forwarded-proto'] = 'http';
    }

    for (const key of this.remove) {
      delete out[key.toLowerCase()];
    }

    for (const [key, value] of Object.entries(this.set)) {
      out[key.toLowerCase()] = value;
    }

    this.emit('transformed', { direction: 'request', headers: out });
    return out;
  }

  applyToResponse(headers) {
    const out = { ...headers };

    for (const key of this.remove) {
      delete out[key.toLowerCase()];
    }

    for (const [key, value] of Object.entries(this.set)) {
      out[key.toLowerCase()] = value;
    }

    this.emit('transformed', { direction: 'response', headers: out });
    return out;
  }
}

function createHeaderTransformer(options = {}) {
  return new HeaderTransformer(options);
}

module.exports = { HeaderTransformer, createHeaderTransformer };
