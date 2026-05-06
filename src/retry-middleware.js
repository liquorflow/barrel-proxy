const { createRetryHandler } = require('./retry');
const logger = require('./logger');

const retryHandlers = new Map();

function getRetryHandlerForService(service, options = {}) {
  const key = service.target;
  if (!retryHandlers.has(key)) {
    retryHandlers.set(
      key,
      createRetryHandler({
        maxAttempts: service.retry?.maxAttempts ?? options.maxAttempts ?? 3,
        delay: service.retry?.delay ?? options.delay ?? 200,
        shouldRetry: options.shouldRetry,
      })
    );
  }
  return retryHandlers.get(key);
}

function createRetryMiddleware(services = [], options = {}) {
  return function retryMiddleware(req, res, next) {
    const service = services.find((s) => req.matchedService === s.target);
    if (!service) return next();

    const handler = getRetryHandlerForService(service, options);

    handler.on('retry', ({ attempt, error }) => {
      logger.log(
        'warn',
        `Retrying request to ${service.target} (attempt ${attempt}): ${error.message}`
      );
    });

    req.retryHandler = handler;
    next();
  };
}

function createRetryStatusRoute(services = []) {
  return function retryStatusRoute(req, res) {
    const status = services.map((s) => {
      const handler = retryHandlers.get(s.target);
      return {
        service: s.target,
        config: handler ? handler.getConfig() : null,
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ retries: status }));
  };
}

function clearRetryHandlers() {
  retryHandlers.clear();
}

module.exports = {
  getRetryHandlerForService,
  createRetryMiddleware,
  createRetryStatusRoute,
  clearRetryHandlers,
};
