const { EventEmitter } = require('events');

const DEFAULT_HEADER = 'x-request-id';

class RequestIdPropagator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.header = options.header || DEFAULT_HEADER;
    this.generate = options.generate || (() => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    this.propagate = options.propagate !== false;
    this.override = options.override === true;
  }

  process(req) {
    const existing = req.headers[this.header];
    if (existing && !this.override) {
      this.emit('existing', { id: existing, url: req.url });
      return existing;
    }
    const id = this.generate();
    req.headers[this.header] = id;
    this.emit('generated', { id, url: req.url });
    return id;
  }
}

function createRequestIdPropagator(options = {}) {
  return new RequestIdPropagator(options);
}

let _propagators = {};

function getPropagatorForService(serviceId, options = {}) {
  if (!_propagators[serviceId]) {
    _propagators[serviceId] = createRequestIdPropagator(options);
  }
  return _propagators[serviceId];
}

function clearPropagators() {
  _propagators = {};
}

function createRequestIdMiddleware(options = {}) {
  const propagator = createRequestIdPropagator(options);
  return function requestIdMiddleware(req, res, next) {
    const id = propagator.process(req);
    res.setHeader(propagator.header, id);
    req._requestId = id;
    next();
  };
}

function createRequestIdStatusRoute(serviceId) {
  return function requestIdStatusRoute(req, res) {
    const propagator = _propagators[serviceId];
    if (!propagator) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no propagator for service' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: serviceId,
      header: propagator.header,
      propagate: propagator.propagate,
      override: propagator.override
    }));
  };
}

module.exports = {
  RequestIdPropagator,
  createRequestIdPropagator,
  getPropagatorForService,
  clearPropagators,
  createRequestIdMiddleware,
  createRequestIdStatusRoute
};
