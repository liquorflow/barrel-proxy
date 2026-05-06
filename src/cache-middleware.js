const { createCache } = require('./cache');

let _cache = null;

function getCache(options) {
  if (!_cache) {
    _cache = createCache(options);
  }
  return _cache;
}

function clearCache() {
  _cache = null;
}

const CACHEABLE_METHODS = new Set(['GET', 'HEAD']);
const CACHEABLE_STATUSES = new Set([200, 203, 204, 301, 404]);

function createCacheMiddleware(options = {}) {
  const cache = getCache(options);

  return function cacheMiddleware(req, res, next) {
    if (!CACHEABLE_METHODS.has(req.method)) return next();

    const entry = cache.get(req);
    if (entry) {
      res.writeHead(entry.status, { ...entry.headers, 'x-cache': 'HIT' });
      res.end(entry.body);
      return;
    }

    const chunks = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    const origWriteHead = res.writeHead.bind(res);

    let statusCode = 200;
    let responseHeaders = {};

    res.writeHead = (status, headers) => {
      statusCode = status;
      responseHeaders = headers || {};
      origWriteHead(status, { ...responseHeaders, 'x-cache': 'MISS' });
    };

    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return origWrite(chunk);
    };

    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (CACHEABLE_STATUSES.has(statusCode)) {
        cache.set(req, statusCode, responseHeaders, Buffer.concat(chunks));
      }
      return origEnd(chunk);
    };

    next();
  };
}

function createCacheStatusRoute(options = {}) {
  const cache = getCache(options);
  return function cacheStatusRoute(req, res) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ size: cache.size(), maxSize: cache.maxSize, maxAge: cache.maxAge }));
  };
}

module.exports = { createCacheMiddleware, createCacheStatusRoute, getCache, clearCache };
