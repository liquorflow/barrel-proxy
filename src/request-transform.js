'use strict';

const { EventEmitter } = require('events');

class RequestTransformer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.addHeaders = config.addHeaders || {};
    this.removeHeaders = config.removeHeaders || [];
    this.rewritePath = config.rewritePath || null;
    this.count = 0;
  }

  transform(req) {
    for (const [key, value] of Object.entries(this.addHeaders)) {
      req.headers[key.toLowerCase()] = value;
    }

    for (const key of this.removeHeaders) {
      delete req.headers[key.toLowerCase()];
    }

    if (this.rewritePath && req.url) {
      const { from, to } = this.rewritePath;
      if (req.url.startsWith(from)) {
        req.url = to + req.url.slice(from.length);
      }
    }

    this.count++;
    this.emit('transformed', { url: req.url, headers: req.headers });
    return req;
  }

  stats() {
    return { count: this.count };
  }
}

function createRequestTransformer(config = {}) {
  return new RequestTransformer(config);
}

module.exports = { RequestTransformer, createRequestTransformer };
