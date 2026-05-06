'use strict';

const { createCacheMiddleware, createCacheStatusRoute, getCache, clearCache } = require('./cache-middleware');

function makeMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    writeHead(code, hdrs) { this.statusCode = code; Object.assign(this.headers, hdrs || {}); },
    end(data) { this.body = data; }
  };
  return res;
}

function makeMockReq(method = 'GET', url = '/api/data', service = 'api') {
  return { method, url, service, headers: {} };
}

beforeEach(() => clearCache());

test('cache middleware skips non-GET requests', async () => {
  const mw = createCacheMiddleware();
  const req = makeMockReq('POST', '/api/data', 'api');
  const res = makeMockRes();
  let called = false;
  await mw(req, res, () => { called = true; });
  expect(called).toBe(true);
});

test('cache middleware calls next on cache miss', async () => {
  const mw = createCacheMiddleware();
  const req = makeMockReq('GET', '/api/data', 'api');
  const res = makeMockRes();
  let called = false;
  await mw(req, res, () => { called = true; });
  expect(called).toBe(true);
});

test('cache middleware sets X-Cache-Status miss header', async () => {
  const mw = createCacheMiddleware();
  const req = makeMockReq('GET', '/api/items', 'api');
  const res = makeMockRes();
  await mw(req, res, () => {});
  expect(res.headers['X-Cache-Status']).toBe('MISS');
});

test('getCache returns same instance for same service', () => {
  const a = getCache('svc');
  const b = getCache('svc');
  expect(a).toBe(b);
});

test('getCache returns different instances for different services', () => {
  const a = getCache('svc1');
  const b = getCache('svc2');
  expect(a).not.toBe(b);
});

test('cache status route returns json with cache info', () => {
  getCache('api');
  const route = createCacheStatusRoute();
  const req = makeMockReq('GET', '/_barrel/cache');
  const res = makeMockRes();
  route(req, res);
  const parsed = JSON.parse(res.body);
  expect(parsed).toHaveProperty('caches');
  expect(Array.isArray(parsed.caches)).toBe(true);
});

test('clearCache removes all cache instances', () => {
  getCache('x');
  clearCache();
  const route = createCacheStatusRoute();
  const req = makeMockReq('GET', '/_barrel/cache');
  const res = makeMockRes();
  route(req, res);
  const parsed = JSON.parse(res.body);
  expect(parsed.caches.length).toBe(0);
});
