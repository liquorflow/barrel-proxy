const { EventEmitter } = require('events');

class ResponseTransformer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.addHeaders = config.addHeaders || {};
    this.removeHeaders = config.removeHeaders || [];
    this.rewriteBody = config.rewriteBody || null; // { search, replace }
    this.enabled = config.enabled !== false;
  }

  transformHeaders(headers) {
    if (!this.enabled) return headers;
    const result = { ...headers };

    for (const key of this.removeHeaders) {
      delete result[key.toLowerCase()];
    }

    for (const [key, value] of Object.entries(this.addHeaders)) {
      result[key.toLowerCase()] = value;
    }

    this.emit('headers-transformed', { added: Object.keys(this.addHeaders), removed: this.removeHeaders });
    return result;
  }

  transformBody(body, contentType = '') {
    if (!this.enabled || !this.rewriteBody) return body;
    if (!contentType.includes('text') && !contentType.includes('json')) return body;

    const str = Buffer.isBuffer(body) ? body.toString('utf8') : body;
    const { search, replace } = this.rewriteBody;
    const pattern = search instanceof RegExp ? search : new RegExp(search, 'g');
    const result = str.replace(pattern, replace);

    this.emit('body-transformed', { search: String(search), replace });
    return Buffer.from(result, 'utf8');
  }

  getStatus() {
    return {
      enabled: this.enabled,
      addHeaders: this.addHeaders,
      removeHeaders: this.removeHeaders,
      rewriteBody: this.rewriteBody ? { search: String(this.rewriteBody.search), replace: this.rewriteBody.replace } : null,
    };
  }
}

function createResponseTransformer(config) {
  return new ResponseTransformer(config);
}

module.exports = { ResponseTransformer, createResponseTransformer };
