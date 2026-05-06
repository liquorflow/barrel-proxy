const { createRateLimiterMiddleware, createRateLimitStatusRoute, clearLimiters } = require('./rate-limiter-middleware');

function makeMockRes() {
  const headers = {};
  return {
    headers,
    statusCode: null,
    body: null,
    setHeader(k, v) { headers[k] = v; },
    writeHead(code) { this.statusCode = code; },
    end(body) { this.body = body; }
  };
}

function makeMockReq(overrides = {}) {
  return {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    matchedService: { id: 'api' },
    ...overrides
  };
}

beforeEach(() => clearLimiters());

test('allows request under limit and sets headers', () => {
  const middleware = createRateLimiterMiddleware({ max: 10, windowMs: 60000 });
  const req = makeMockReq();
  const res = makeMockRes();
  let called = false;
  middleware(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(res.headers['X-RateLimit-Limit']).toBe(10);
  expect(res.headers['X-RateLimit-Remaining']).toBe(9);
});

test('blocks request over limit with 429', () => {
  const middleware = createRateLimiterMiddleware({ max: 1, windowMs: 60000 });
  const req = makeMockReq();
  const res1 = makeMockRes();
  const res2 = makeMockRes();
  middleware(req, res1, () => {});
  let called = false;
  middleware(req, res2, () => { called = true; });
  expect(called).toBe(false);
  expect(res2.statusCode).toBe(429);
});

test('uses x-forwarded-for header for client ip', () => {
  const middleware = createRateLimiterMiddleware({ max: 5 });
  const req = makeMockReq({ headers: { 'x-forwarded-for': '10.0.0.1' } });
  const res = makeMockRes();
  middleware(req, res, () => {});
  expect(res.headers['X-RateLimit-Remaining']).toBe(4);
});

test('status route returns limiter stats', () => {
  const middleware = createRateLimiterMiddleware({ max: 5 });
  const req = makeMockReq();
  middleware(req, makeMockRes(), () => {});
  const statusRoute = createRateLimitStatusRoute();
  const res = makeMockRes();
  statusRoute({}, res);
  const body = JSON.parse(res.body);
  expect(body['api']).toBeDefined();
});
