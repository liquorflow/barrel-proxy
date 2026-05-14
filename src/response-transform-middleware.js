const { createResponseTransformer } = require('./response-transform');

const transformers = new Map();

function getTransformerForService(service) {
  if (!transformers.has(service.name)) {
    const config = service.responseTransform || {};
    transformers.set(service.name, createResponseTransformer(config));
  }
  return transformers.get(service.name);
}

function clearTransformers() {
  transformers.clear();
}

function createResponseTransformMiddleware(service) {
  const transformer = getTransformerForService(service);

  return function responseTransformMiddleware(req, res, next) {
    if (!transformer.enabled) return next();

    const originalWriteHead = res.writeHead.bind(res);
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    const chunks = [];
    let statusCode;
    let headers;

    res.writeHead = function (code, hdrs) {
      statusCode = code;
      headers = transformer.transformHeaders(hdrs || {});
    };

    res.write = function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };

    res.end = function (chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const rawBody = Buffer.concat(chunks);
      const contentType = (headers && headers['content-type']) || '';
      const transformed = transformer.transformBody(rawBody, contentType);

      if (headers) {
        headers['content-length'] = String(transformed.length);
        originalWriteHead(statusCode || 200, headers);
      }
      originalEnd(transformed);
    };

    next();
  };
}

function createResponseTransformStatusRoute(services) {
  return function (req, res) {
    const status = services.map(s => ({
      service: s.name,
      ...getTransformerForService(s).getStatus(),
    }));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  };
}

module.exports = { getTransformerForService, clearTransformers, createResponseTransformMiddleware, createResponseTransformStatusRoute };
