const { createTimeoutHandler } = require('./timeout');
const logger = require('./logger');

const handlers = new Map();

function getHandlerForService(service) {
  if (!handlers.has(service.name)) {
    const timeoutMs = service.timeout ?? undefined;
    handlers.set(service.name, createTimeoutHandler({ timeoutMs }));
  }
  return handlers.get(service.name);
}

function clearHandlers() {
  handlers.clear();
}

function createTimeoutMiddleware(services) {
  return function timeoutMiddleware(req, res, next) {
    const service = services.find((s) => req.matchedService === s.name);
    if (!service) return next();

    const handler = getHandlerForService(service);

    handler.once('timeout', () => {
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway Timeout' }));
      }
      logger.log('warn', `Timeout for service "${service.name}" after ${handler.timeoutMs}ms`);
    });

    req.socket.setTimeout(handler.timeoutMs);
    req.socket.once('timeout', () => {
      req.socket.destroy();
    });

    next();
  };
}

function createTimeoutStatusRoute(services) {
  return function timeoutStatusRoute(req, res) {
    const status = {};
    for (const service of services) {
      if (handlers.has(service.name)) {
        status[service.name] = handlers.get(service.name).stats();
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  };
}

module.exports = {
  getHandlerForService,
  createTimeoutMiddleware,
  createTimeoutStatusRoute,
  clearHandlers,
};
