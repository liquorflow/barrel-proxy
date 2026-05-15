const { createRequestQueue } = require('./request-queue');

const queues = new Map();

function getQueueForService(service) {
  if (!queues.has(service.name)) {
    queues.set(service.name, createRequestQueue({
      concurrency: service.queueConcurrency || 10,
      timeout: service.queueTimeout || 30000,
    }));
  }
  return queues.get(service.name);
}

function clearQueues() {
  queues.clear();
}

function createRequestQueueMiddleware(service) {
  if (!service || (!service.queueConcurrency && !service.queueTimeout)) {
    return (req, res, next) => next();
  }
  const queue = getQueueForService(service);
  return (req, res, next) => {
    queue.enqueue(() => new Promise((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      next();
    })).catch((err) => {
      if (err.code === 'QUEUE_TIMEOUT') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service queue timeout', service: service.name }));
      } else {
        next(err);
      }
    });
  };
}

function createQueueStatusRoute(services) {
  return (req, res) => {
    const status = {};
    for (const svc of services) {
      if (queues.has(svc.name)) {
        status[svc.name] = queues.get(svc.name).stats();
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  };
}

module.exports = { getQueueForService, clearQueues, createRequestQueueMiddleware, createQueueStatusRoute };
