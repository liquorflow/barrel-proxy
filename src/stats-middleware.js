function createStatsMiddleware(stats) {
  return function statsMiddleware(req, res, next) {
    const start = Date.now();
    const finish = () => {
      const duration = Date.now() - start;
      const serviceId = req.matchedService || 'unknown';
      stats.record(serviceId, res.statusCode, duration);
    };
    res.on('finish', finish);
    next();
  };
}

function createStatsRoute(stats) {
  return function statsRoute(req, res) {
    if (req.url !== '/_barrel/stats') return false;
    const data = stats.summary();
    const body = JSON.stringify(data, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
    return true;
  };
}

module.exports = { createStatsMiddleware, createStatsRoute };
