const { createCircuitBreakerMiddleware, createCircuitStatusRoute, getBreakerForService, clearBreakers } = require('./circuit-breaker-middleware');

function makeMockRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.writeHead = (code, headers) => { res.statusCode = code; Object.assign(res.headers, headers); };
  res.end = (body) => { res.body = body; };
  return res;
}

function makeMockReq(overrides = {}) {
  return { url: '/api/foo', method: 'GET', matchedService: { name: 'api' }, ...overrides };
}

beforeEach(() => clearBreakers());

describe('createCircuitBreakerMiddleware', () => {
  test('calls next when circuit is closed', () => {
    const mw = createCircuitBreakerMiddleware();
    const req = makeMockReq();
    const res = makeMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.circuitBreaker).toBeDefined();
  });

  test('returns 503 when circuit is open', () => {
    const mw = createCircuitBreakerMiddleware({ threshold: 1 });
    const req = makeMockReq();
    const res = makeMockRes();
    const cb = getBreakerForService({ name: 'api' }, { threshold: 1 });
    cb.recordFailure();
    const next = jest.fn();
    mw(req, res, next);
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('skips when no matched service', () => {
    const mw = createCircuitBreakerMiddleware();
    const req = { url: '/', method: 'GET' };
    const res = makeMockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createCircuitStatusRoute', () => {
  test('returns circuit status as JSON', () => {
    getBreakerForService({ name: 'web' }, {});
    const route = createCircuitStatusRoute();
    const req = { url: '/_barrel/circuits', method: 'GET' };
    const res = makeMockRes();
    const next = jest.fn();
    route(req, res, next);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('web');
  });

  test('calls next for non-matching routes', () => {
    const route = createCircuitStatusRoute();
    const req = { url: '/other', method: 'GET' };
    const res = makeMockRes();
    const next = jest.fn();
    route(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
