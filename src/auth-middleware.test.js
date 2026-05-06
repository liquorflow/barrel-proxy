const { createAuthMiddleware, createAuthStatusRoute, clearGuard } = require('./auth-middleware');

function makeMockRes() {
  const res = { statusCode: null, headers: {}, body: null };
  res.writeHead = (code, headers) => { res.statusCode = code; Object.assign(res.headers, headers); };
  res.end = (body) => { res.body = body; };
  return res;
}

function makeMockReq(overrides = {}) {
  return { headers: {}, url: '/', method: 'GET', ...overrides };
}

beforeEach(() => clearGuard());

describe('createAuthMiddleware', () => {
  test('passes through when auth disabled (no tokens)', () => {
    const mw = createAuthMiddleware();
    const next = jest.fn();
    mw(makeMockReq(), makeMockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('allows valid bearer token', () => {
    const mw = createAuthMiddleware({ tokens: ['valid'] });
    const next = jest.fn();
    const req = makeMockReq({ headers: { authorization: 'Bearer valid' } });
    mw(req, makeMockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('rejects missing token with 401', () => {
    const mw = createAuthMiddleware({ tokens: ['secret'] });
    const res = makeMockRes();
    mw(makeMockReq(), res, jest.fn());
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });

  test('rejects wrong token with 401', () => {
    const mw = createAuthMiddleware({ tokens: ['secret'] });
    const res = makeMockRes();
    const req = makeMockReq({ headers: { authorization: 'Bearer wrong' } });
    mw(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
  });

  test('allows token via query string', () => {
    const mw = createAuthMiddleware({ tokens: ['qtoken'] });
    const next = jest.fn();
    const req = makeMockReq({ url: '/admin?token=qtoken' });
    mw(req, makeMockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createAuthStatusRoute', () => {
  test('returns auth status', () => {
    clearGuard();
    const route = createAuthStatusRoute({ tokens: ['t1', 't2'] });
    const res = makeMockRes();
    route(makeMockReq(), res);
    const body = JSON.parse(res.body);
    expect(body.enabled).toBe(true);
    expect(body.tokenCount).toBe(2);
  });
});
