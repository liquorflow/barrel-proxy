const { createStickySessionRouter } = require('./sticky-session');

let router = null;

function getRouter(options) {
  if (!router) router = createStickySessionRouter(options);
  return router;
}

function clearRouter() {
  if (router) router.stop();
  router = null;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) acc[k.trim()] = v.join('=').trim();
    return acc;
  }, {});
}

function createStickySessionMiddleware(service) {
  const cfg = service.stickySession || {};
  const r = getRouter(cfg);
  const cookieName = cfg.cookieName || 'barrel_sticky';

  return function stickySessionMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers['cookie']);
    let sessionId = cookies[cookieName];
    let existingTarget = null;

    if (sessionId) {
      existingTarget = r.getTarget(sessionId);
    }

    if (!sessionId) {
      sessionId = r.generateId();
      res.setHeader('Set-Cookie', `${cookieName}=${sessionId}; HttpOnly; Path=/`);
    }

    req.stickySessionId = sessionId;
    req.stickyTarget = existingTarget || null;

    if (!existingTarget && req.proxyTarget) {
      r.bind(sessionId, req.proxyTarget);
    } else if (existingTarget) {
      req.proxyTarget = existingTarget;
    }

    next();
  };
}

function createStickyStatusRoute(service) {
  const cfg = service.stickySession || {};
  const r = getRouter(cfg);
  return function stickyStatusRoute(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeSessions: r.sessions.size,
      cookieName: cfg.cookieName || 'barrel_sticky',
      ttl: cfg.ttl || 3600000,
    }));
  };
}

module.exports = {
  getRouter,
  clearRouter,
  createStickySessionMiddleware,
  createStickyStatusRoute,
};
