const { createRequestTransformer } = require('./request-transform');

const transformers = new Map();

function getTransformerForService(service) {
  const key = service.name || service.target;
  if (!transformers.has(key)) {
    const config = service.requestTransform || {};
    transformers.set(key, createRequestTransformer(config));
  }
  return transformers.get(key);
}

function clearTransformers() {
  transformers.clear();
}

function createRequestTransformMiddleware(service) {
  const transformer = getTransformerForService(service);

  return function requestTransformMiddleware(req, res, next) {
    try {
      if (transformer.config.headers) {
        for (const [key, value] of Object.entries(transformer.config.headers)) {
          if (value === null) {
            delete req.headers[key.toLowerCase()];
          } else {
            req.headers[key.toLowerCase()] = value;
          }
        }
        transformer.emit('headers-applied', { service: service.name, headers: transformer.config.headers });
      }

      if (transformer.config.rewritePath && req.url) {
        const { from, to } = transformer.config.rewritePath;
        const original = req.url;
        req.url = req.url.replace(new RegExp(from), to);
        if (req.url !== original) {
          transformer.emit('path-rewritten', { from: original, to: req.url });
        }
      }

      if (transformer.config.setMethod) {
        req.method = transformer.config.setMethod.toUpperCase();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function createRequestTransformStatusRoute(services) {
  return function requestTransformStatusRoute(req, res) {
    const status = (services || []).map(service => {
      const transformer = getTransformerForService(service);
      return {
        service: service.name || service.target,
        config: transformer.config
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ requestTransforms: status }));
  };
}

module.exports = {
  getTransformerForService,
  clearTransformers,
  createRequestTransformMiddleware,
  createRequestTransformStatusRoute
};
