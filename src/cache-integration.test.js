'use strict';

const http = require('http');
const { createCacheMiddleware, clearCache } = require('./cache-middleware');
const { compose } = require('./middleware');

function buildServer(middlewares) {
  const handler = compose(middlewares);
  return http.createServer((req, res) => {
    req.service = 'api';
    handler(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    });
  });
}

function get(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

let server;

beforeEach((done) => {
  clearCache();
  server = buildServer([createCacheMiddleware({ ttl: 500 })]);
  server.listen(0, '127.0.0.1', done);
});

afterEach((done) => server.close(done));

test('first request is a cache miss', async () => {
  const res = await get(server, '/api/items');
  expect(res.status).toBe(200);
  expect(res.headers['x-cache-status']).toBe('MISS');
});

test('second request to same url is a cache hit', async () => {
  await get(server, '/api/items');
  const res = await get(server, '/api/items');
  expect(res.headers['x-cache-status']).toBe('HIT');
});

test('cached response body matches original', async () => {
  const first = await get(server, '/api/things');
  const second = await get(server, '/api/things');
  expect(second.body).toBe(first.body);
});

test('different paths are cached independently', async () => {
  await get(server, '/api/a');
  await get(server, '/api/b');
  const resA = await get(server, '/api/a');
  const resB = await get(server, '/api/b');
  expect(resA.headers['x-cache-status']).toBe('HIT');
  expect(resB.headers['x-cache-status']).toBe('HIT');
});
