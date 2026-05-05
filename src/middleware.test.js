const http = require('http');
const { requestLogger, requestId, badGateway, notFound, compose } = require('./middleware');
const logger = require('./logger');

function makeMockRes(overrides = {}) {
  const listeners = {};
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(code, hdrs) { this.statusCode = code; Object.assign(this.headers, hdrs); },
    end(b) { this.body = b; },
    on(event, fn) { listeners[event] = fn; },
    emit(event) { if (listeners[event]) listeners[event](); },
    ...overrides,
  };
}

function makeMockReq(overrides = {}) {
  return { method: 'GET', url: '/test', ...overrides };
}

describe('requestId', () => {
  test('sets X-Request-Id header and req.requestId', () => {
    const req = makeMockReq();
    const res = makeMockRes();
    let called = false;
    requestId(req, res, () => { called = true; });
    expect(req.requestId).toBeDefined();
    expect(res.headers['X-Request-Id']).toBe(req.requestId);
    expect(called).toBe(true);
  });
});

describe('badGateway', () => {
  test('writes 502 JSON response', () => {
    const req = makeMockReq();
    const res = makeMockRes();
    badGateway(req, res, 'api');
    expect(res.statusCode).toBe(502);
    const parsed = JSON.parse(res.body);
    expect(parsed.error).toBe('Bad Gateway');
    expect(parsed.message).toContain('api');
  });
});

describe('notFound', () => {
  test('writes 404 JSON response', () => {
    const req = makeMockReq({ url: '/missing' });
    const res = makeMockRes();
    notFound(req, res);
    expect(res.statusCode).toBe(404);
    const parsed = JSON.parse(res.body);
    expect(parsed.error).toBe('Not Found');
    expect(parsed.path).toBe('/missing');
  });
});

describe('compose', () => {
  test('runs middleware in order', () => {
    const order = [];
    const a = (req, res, next) => { order.push('a'); next(); };
    const b = (req, res, next) => { order.push('b'); next(); };
    const runner = compose(a, b);
    runner(makeMockReq(), makeMockRes());
    expect(order).toEqual(['a', 'b']);
  });

  test('stops if next is not called', () => {
    const order = [];
    const a = (req, res, next) => { order.push('a'); };
    const b = (req, res, next) => { order.push('b'); next(); };
    const runner = compose(a, b);
    runner(makeMockReq(), makeMockRes());
    expect(order).toEqual(['a']);
  });
});
