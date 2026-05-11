const { createHeaderTransformMiddleware, createHeaderStatusRoute, getTransformerForService, clearTransformers } = require('./header-transform-middleware');

function makeMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    removeHeader(k) { delete this.headers[k]; },
    end(body) { this.body = body; },
    json(data) { this.body = JSON.stringify(data); }
  };
}

function makeMockReq(overrides = {}) {
  return {
    method: 'GET',
    url: '/test',
    headers: { host: 'localhost', 'x-request-id': 'abc123' },
    service: { name: 'api', target: 'http://localhost:3000' },
    ...overrides
  };
}

beforeEach(() => {
  clearTransformers();
});

describe('getTransformerForService', () => {
  test('returns same instance for same service', () => {
    const svc = { name: 'api', target: 'http://localhost:3000' };
    const a = getTransformerForService(svc);
    const b = getTransformerForService(svc);
    expect(a).toBe(b);
  });

  test('returns different instances for different services', () => {
    const svc1 = { name: 'api', target: 'http://localhost:3000' };
    const svc2 = { name: 'web', target: 'http://localhost:4000' };
    expect(getTransformerForService(svc1)).not.toBe(getTransformerForService(svc2));
  });
});

describe('createHeaderTransformMiddleware', () => {
  test('calls next when no service on request', done => {
    const middleware = createHeaderTransformMiddleware();
    const req = { headers: {} };
    const res = makeMockRes();
    middleware(req, res, done);
  });

  test('adds request headers defined in service config', done => {
    const svc = {
      name: 'api',
      target: 'http://localhost:3000',
      headers: { request: { add: { 'x-forwarded-by': 'barrel' } } }
    };
    const middleware = createHeaderTransformMiddleware();
    const req = makeMockReq({ service: svc });
    const res = makeMockRes();
    middleware(req, res, () => {
      expect(req.headers['x-forwarded-by']).toBe('barrel');
      done();
    });
  });

  test('removes request headers defined in service config', done => {
    const svc = {
      name: 'api',
      target: 'http://localhost:3000',
      headers: { request: { remove: ['x-request-id'] } }
    };
    const middleware = createHeaderTransformMiddleware();
    const req = makeMockReq({ service: svc });
    const res = makeMockRes();
    middleware(req, res, () => {
      expect(req.headers['x-request-id']).toBeUndefined();
      done();
    });
  });

  test('applies response header transforms via res.setHeader override', done => {
    const svc = {
      name: 'api',
      target: 'http://localhost:3000',
      headers: { response: { add: { 'x-powered-by': 'barrel-proxy' } } }
    };
    const middleware = createHeaderTransformMiddleware();
    const req = makeMockReq({ service: svc });
    const res = makeMockRes();
    middleware(req, res, () => {
      // simulate proxy setting a header
      res.setHeader('content-type', 'application/json');
      expect(res.headers['x-powered-by']).toBe('barrel-proxy');
      done();
    });
  });
});

describe('createHeaderStatusRoute', () => {
  test('returns 200 with transformer info for known service', () => {
    const svc = { name: 'api', target: 'http://localhost:3000' };
    getTransformerForService(svc);
    const handler = createHeaderStatusRoute();
    const req = { url: '/_barrel/headers/api' };
    const res = makeMockRes();
    handler(req, res);
    const data = JSON.parse(res.body);
    expect(data.service).toBe('api');
    expect(data).toHaveProperty('counts');
  });

  test('returns 404 for unknown service', () => {
    const handler = createHeaderStatusRoute();
    const req = { url: '/_barrel/headers/unknown' };
    const res = makeMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(404);
  });
});
