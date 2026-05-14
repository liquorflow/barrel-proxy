const { createIpFilter } = require('./ip-filter');

const filters = new Map();

function getFilterForService(service) {
  const key = service.name || service.target;
  if (!filters.has(key)) {
    const cfg = service.ipFilter || {};
    filters.set(key, createIpFilter({
      allow: cfg.allow || [],
      deny: cfg.deny || [],
      mode: cfg.mode || 'allow'
    }));
  }
  return filters.get(key);
}

function clearFilters() {
  filters.clear();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || '127.0.0.1';
}

function createIpFilterMiddleware(service) {
  if (!service.ipFilter) {
    return (req, res, next) => next();
  }
  const filter = getFilterForService(service);
  return function ipFilterMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const allowed = filter.check(ip);
    if (!allowed) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden', ip }));
      filter.emit('blocked', { ip, service: service.name });
      return;
    }
    next();
  };
}

function createIpFilterStatusRoute(services) {
  return function ipFilterStatusRoute(req, res) {
    const status = (services || []).map(s => {
      const cfg = s.ipFilter || null;
      return { service: s.name, ipFilter: cfg };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ipFilters: status }));
  };
}

module.exports = {
  getFilterForService,
  clearFilters,
  createIpFilterMiddleware,
  createIpFilterStatusRoute
};
