const { createHeaderTransformer } = require('./header-transform');

const transformers = new Map();

function getTransformerForService(service) {
  if (!transformers.has(service.name)) {
    const opts = service.headers || {};
    transformers.set(service.name, createHeaderTransformer(opts));
  }
  return transformers.get(service.name);
}

function clearTransformers() {
  transformers.clear();
}

function createHeaderTransformMiddleware(service) {
  const transformer = getTransformerForService(service);

  return function headerTransformMiddleware(req, res, next) {
    const clientIp = req.socket?.remoteAddress || '127.0.0.1';
    req.headers = transformer.applyToRequest(req.headers, clientIp);

    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (statusCode, statusMessage, headers) {
      if (typeof statusMessage === 'object' && !headers) {
        headers = statusMessage;
        statusMessage = undefined;
      }
      const transformed = transformer.applyToResponse(headers || {});
      if (statusMessage) {
        return originalWriteHead(statusCode, statusMessage, transformed);
      }
      return originalWriteHead(statusCode, transformed);
    };

    next();
  };
}

function createHeaderStatusRoute(services) {
  return function headerStatusRoute(req, res) {
    const result = {};
    for (const service of services) {
      result[service.name] = service.headers || {};
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
  };
}

module.exports = {
  getTransformerForService,
  clearTransformers,
  createHeaderTransformMiddleware,
  createHeaderStatusRoute,
};
