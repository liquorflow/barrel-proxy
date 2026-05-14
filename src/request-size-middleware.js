const { createRequestSizeGuard } = require('./request-size');

const guards = new Map();

function getGuardForService(service) {
  if (!guards.has(service.name)) {
    const maxBytes = service.maxRequestSize ?? null;
    if (maxBytes === null) return null;
    guards.set(service.name, createRequestSizeGuard({ maxBytes }));
  }
  return guards.get(service.name);
}

function clearGuards() {
  guards.clear();
}

function createRequestSizeMiddleware(service) {
  return function requestSizeMiddleware(req, res, next) {
    const guard = getGuardForService(service);
    if (!guard) return next();

    if (!guard.check(req)) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Payload Too Large',
        maxBytes: guard.maxBytes,
      }));
      return;
    }
    next();
  };
}

function createRequestSizeStatusRoute(service) {
  return function requestSizeStatusRoute(req, res) {
    const guard = getGuardForService(service);
    if (!guard) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ enabled: false }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ enabled: true, ...guard.stats() }));
  };
}

module.exports = {
  getGuardForService,
  clearGuards,
  createRequestSizeMiddleware,
  createRequestSizeStatusRoute,
};
