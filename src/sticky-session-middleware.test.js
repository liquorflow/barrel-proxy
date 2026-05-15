const { createStickySessionMiddleware, createStickyStatusRoute, clearRouter } = require('./sticky-session-middleware');

function makeMockReq(overrides = {}) {
  return { headers: {}, proxyTarget: 'http://localhost:3001', ...overrides };
}

function makeMockRes() {
  const headers = {};
  return {
    headers,
    setHeader(k, v) { headers[k] = v; },
    writeHead() {},
    end: jest.fn(),
  };
}

beforeEach(() => clearRouter());
afterEach(() => clearRouter());

const service = { stickySession: { cookieName: 'test_sticky', ttl: 3600000 } };

test('sets a cookie when no session exists', () => {
  const mw = createStickySessionMiddleware(service);
  const req = makeMockReq();
  const res = makeMockRes();
  const next = jest.fn();
  mw(req, res, next);
  expect(res.headers['Set-Cookie']).toMatch(/^test_sticky=/);
  expect(next).toHaveBeenCalled();
});

test('reuses existing session target from cookie', () => {
  const mw = createStickySessionMiddleware(service);
  const req1 = makeMockReq();
  const res1 = makeMockRes();
  mw(req1, res1, () => {});
  const cookieVal = res1.headers['Set-Cookie'].split(';')[0].split('=')[1];

  const req2 = makeMockReq({ headers: { cookie: `test_sticky=${cookieVal}` }, proxyTarget: 'http://localhost:9999' });
  const res2 = makeMockRes();
  mw(req2, res2, () => {});
  expect(req2.proxyTarget).toBe('http://localhost:3001');
});

test('assigns stickySessionId to request', () => {
  const mw = createStickySessionMiddleware(service);
  const req = makeMockReq();
  const res = makeMockRes();
  mw(req, res, () => {});
  expect(typeof req.stickySessionId).toBe('string');
  expect(req.stickySessionId.length).toBeGreaterThan(0);
});

test('status route returns session info', () => {
  const route = createStickyStatusRoute(service);
  const res = makeMockRes();
  route({}, res);
  const payload = JSON.parse(res.end.mock.calls[0][0]);
  expect(payload).toHaveProperty('activeSessions');
  expect(payload).toHaveProperty('cookieName', 'test_sticky');
  expect(payload).toHaveProperty('ttl', 3600000);
});
