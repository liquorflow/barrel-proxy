const { log } = require('./logger');

const DEFAULT_HEALTH_PATH = '/__barrel/health';

/**
 * Check if a service target is reachable by making a HEAD request.
 * Returns a promise that resolves to { name, url, status, ok }.
 */
function checkService(service, timeoutMs = 3000) {
  const url = service.target;
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? require('https') : require('http');
    const req = proto.request(url, { method: 'HEAD', timeout: timeoutMs }, (res) => {
      resolve({ name: service.name, url, status: res.statusCode, ok: true });
    });
    req.on('error', () => {
      resolve({ name: service.name, url, status: null, ok: false });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ name: service.name, url, status: null, ok: false });
    });
    req.end();
  });
}

/**
 * Run health checks against all configured services in parallel.
 */
async function checkAll(services, timeoutMs) {
  const results = await Promise.all(
    services.map((s) => checkService(s, timeoutMs))
  );
  results.forEach((r) => {
    const symbol = r.ok ? '✓' : '✗';
    log('info', `[health] ${symbol} ${r.name} (${r.url}) — ${r.ok ? r.status : 'unreachable'}`);
  });
  return results;
}

/**
 * Express-style middleware that exposes a health endpoint.
 * Returns 200 with JSON summary of all service statuses.
 */
function createHealthMiddleware(services, opts = {}) {
  const path = opts.path || DEFAULT_HEALTH_PATH;
  const timeout = opts.timeout || 3000;

  return async function healthMiddleware(req, res, next) {
    if (req.url !== path) return next();
    try {
      const results = await checkAll(services, timeout);
      const allOk = results.every((r) => r.ok);
      res.writeHead(allOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: allOk, services: results }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  };
}

module.exports = { checkService, checkAll, createHealthMiddleware, DEFAULT_HEALTH_PATH };
