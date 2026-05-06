const { createStatsMiddleware, createStatsRoute } = require('./stats-middleware');
const { createStats } = require('./stats');
const { EventEmitter } = require('events');

function makeMockRes(statusCode = 200) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.writeHead = jest.fn();
  res.end = jest.fn();
  return res;
}

function makeMockReq(url = '/foo', service = 'api') {
  return { url, matchedService: service };
}

describe('createStatsMiddleware', () => {
  test('calls next immediately', () => {
    const stats = createStats();
    const mw = createStatsMiddleware(stats);
    const next = jest.fn();
    mw(makeMockReq(), makeMockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('records stats on response finish', () => {
    const stats = createStats();
    const mw = createStatsMiddleware(stats);
    const res = makeMockRes(200);
    mw(makeMockReq('/x', 'web'), res, () => {});
    res.emit('finish');
    expect(stats.counters['web'].total).toBe(1);
  });

  test('uses unknown for unmatched requests', () => {
    const stats = createStats();
    const mw = createStatsMiddleware(stats);
    const req = { url: '/y' };
    const res = makeMockRes(404);
    mw(req, res, () => {});
    res.emit('finish');
    expect(stats.counters['unknown'].total).toBe(1);
  });
});

describe('createStatsRoute', () => {
  test('returns false for non-stats urls', () => {
    const stats = createStats();
    const route = createStatsRoute(stats);
    const req = { url: '/other' };
    const res = makeMockRes();
    expect(route(req, res)).toBe(false);
  });

  test('responds with JSON summary for /_barrel/stats', () => {
    const stats = createStats();
    stats.record('api', 200, 50);
    const route = createStatsRoute(stats);
    const req = { url: '/_barrel/stats' };
    const res = makeMockRes();
    const result = route(req, res);
    expect(result).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json' }));
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.services.length).toBe(1);
  });
});
