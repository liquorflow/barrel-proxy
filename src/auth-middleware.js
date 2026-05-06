const { createAuthGuard } = require('./auth');

let _guard = null;

function getGuard(options) {
  if (!_guard) _guard = createAuthGuard(options);
  return _guard;
}

function clearGuard() {
  _guard = null;
}

function createAuthMiddleware(options = {}) {
  const guard = getGuard(options);

  return function authMiddleware(req, res, next) {
    if (!guard.enabled) return next();

    const token = guard.extractToken(req);
    if (guard.check(token)) return next();

    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer realm="${guard.realm}"`
    });
    res.end(JSON.stringify({ error: 'Unauthorized', message: 'Valid Bearer token required' }));
  };
}

function createAuthStatusRoute(options = {}) {
  const guard = getGuard(options);

  return function authStatusRoute(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      enabled: guard.enabled,
      realm: guard.realm,
      tokenCount: guard.tokens.size
    }));
  };
}

module.exports = { createAuthMiddleware, createAuthStatusRoute, clearGuard, getGuard };
