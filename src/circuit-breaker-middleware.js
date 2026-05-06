const { createCircuitBreaker } = require('./circuit-breaker');
const logger = require('./logger');

const breakers = new Map();

function getBreakerForService(service, options) {
  if (!breakers.has(service.name)) {
    const cb = createCircuitBreaker(options);
    cb.on('open', ({ failures }) => {
      logger.log('warn', `Circuit open for service "${service.name}" after ${failures} failures`);
    });
    cb.on('close', () => {
      logger.log('info', `Circuit closed for service "${service.name}"`);
    });
    cb.on('half_open', () => {
      logger.log('info', `Circuit half-open for service "${service.name}", probing...`);
    });
    breakers.set(service.name, cb);
  }
  return breakers.get(service.name);
}

function createCircuitBreakerMiddleware(options = {}) {
  return function circuitBreakerMiddleware(req, res, next) {
    if (!req.matchedService) return next();
    const cb = getBreakerForService(req.matchedService, options);
    if (cb.isOpen()) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service temporarily unavailable', service: req.matchedService.name }));
      return;
    }
    req.circuitBreaker = cb;
    next();
  };
}

function createCircuitStatusRoute(path = '/_barrel/circuits') {
  return function circuitStatusRoute(req, res, next) {
    if (req.url !== path || req.method !== 'GET') return next();
    const status = {};
    for (const [name, cb] of breakers.entries()) {
      status[name] = cb.getState();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  };
}

function clearBreakers() {
  breakers.clear();
}

module.exports = { createCircuitBreakerMiddleware, createCircuitStatusRoute, getBreakerForService, clearBreakers };
