const http = require('http');
const { createRateLimiterMiddleware, clearLimiters } = require('./rate-limiter-middleware');

function buildServer(middlewareOptions) {
  const middleware = createRateLimiterMiddleware(middlewareOptions);
  return http.createServer((req, res) => {
    req.matchedService = { id: 'test-service' };
    middleware(req, res, () => {
      res.writeHead(200);
      res.end('ok');
    });
  });
}

function get(server, path = '/') {
  return new Promise((resolve) => {
    const { port } = server.address();
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
  });
}

beforeEach(() => clearLimiters());

test('serves requests under rate limit', done => {
  const server = buildServer({ max: 5, windowMs: 60000 });
  server.listen(0, async () => {
    const res = await get(server);
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
    expect(res.headers['x-ratelimit-remaining']).toBe('4');
    server.close(done);
  });
});

test('returns 429 when limit exceeded', done => {
  const server = buildServer({ max: 2, windowMs: 60000 });
  server.listen(0, async () => {
    await get(server);
    await get(server);
    const res = await get(server);
    expect(res.status).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Too Many Requests');
    server.close(done);
  });
});
