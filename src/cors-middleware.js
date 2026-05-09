const { buildCorsHeaders, createCorsMiddleware: _create, createCorsStatusRoute } = require('./cors');

const guardMap = new Map();

function getGuardForService(service, options = {}) {
  if (!guardMap.has(service)) {
    guardMap.set(service, createCorsMiddleware(options));
  }
  return guardMap.get(service);
}

function clearGuards() {
  guardMap.clear();
}

function createCorsMiddleware(options = {}) {
  const { origins = ['*'], methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], headers = [], credentials = false } = options;

  return function corsMiddleware(req, res, next) {
    const origin = req.headers['origin'];
    const corsHeaders = buildCorsHeaders({ origins, methods, headers, credentials }, origin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value !== null) res.setHeader(key, value);
    });

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

function createServiceCorsMiddleware(req, res, next) {
  const service = req._matchedService;
  if (!service || !service.cors) return next();
  const mw = getGuardForService(service.name, service.cors);
  mw(req, res, next);
}

module.exports = {
  createCorsMiddleware,
  createServiceCorsMiddleware,
  createCorsStatusRoute,
  getGuardForService,
  clearGuards
};
