const { createRateLimiter } = require('./rate-limiter');
const logger = require('./logger');

const limiters = new Map();

function getLimiterForService(serviceId, options = {}) {
  if (!limiters.has(serviceId)) {
    limiters.set(serviceId, createRateLimiter(options));
  }
  return limiters.get(serviceId);
}

function createRateLimiterMiddleware(config = {}) {
  const { windowMs = 60000, max = 100, services = {} } = config;

  return function rateLimiterMiddleware(req, res, next) {
    const serviceId = req.matchedService ? req.matchedService.id : '__global__';
    const serviceConfig = services[serviceId] || { windowMs, max };
    const limiter = getLimiterForService(serviceId, serviceConfig);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${serviceId}:${clientIp}`;

    const result = limiter.check(key);

    res.setHeader('X-RateLimit-Limit', serviceConfig.max || max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      logger.log('warn', `Rate limit exceeded for ${key}`);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests', retryAfter: result.retryAfter }));
      return;
    }

    next();
  };
}

function createRateLimitStatusRoute() {
  return function rateLimitStatusRoute(req, res) {
    const status = {};
    for (const [id, limiter] of limiters.entries()) {
      status[id] = limiter.getStats();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  };
}

function clearLimiters() {
  limiters.clear();
}

module.exports = { getLimiterForService, createRateLimiterMiddleware, createRateLimitStatusRoute, clearLimiters };
