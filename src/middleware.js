/**
 * Request middleware pipeline for barrel-proxy
 * Handles logging, error responses, and request enrichment
 */

const logger = require('./logger');

/**
 * Logs incoming requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    logger.log(level, `${method} ${url} → ${status} (${duration}ms)`);
  });

  next();
}

/**
 * Adds a request ID header for tracing
 */
function requestId(req, res, next) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/**
 * Returns a 502 Bad Gateway response with JSON body
 */
function badGateway(req, res, serviceName) {
  const body = JSON.stringify({
    error: 'Bad Gateway',
    message: `Service "${serviceName}" is unavailable`,
    path: req.url,
  });
  res.writeHead(502, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Returns a 404 Not Found response with JSON body
 */
function notFound(req, res) {
  const body = JSON.stringify({
    error: 'Not Found',
    message: `No service matched path: ${req.url}`,
    path: req.url,
  });
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Composes middleware functions into a single runner
 */
function compose(...fns) {
  return function run(req, res) {
    let i = 0;
    function next() {
      const fn = fns[i++];
      if (fn) fn(req, res, next);
    }
    next();
  };
}

module.exports = { requestLogger, requestId, badGateway, notFound, compose };
