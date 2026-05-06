const http = require('http');
const { createCircuitBreakerMiddleware, clearBreakers, getBreakerForService } = require('./circuit-breaker-middleware');
const { compose } = require('./middleware');

function buildServer(middlewares) {
  const handler = compose(middlewares);
  return http.createServer((req, res) => handler(req, res, () => {
    res.writeHead(200);
    res.end('ok');
  }));
}

function get(server, path) {
  return new Promise((resolve) => {
    const { port } = server.address();
    http.get(`http://localhost:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
  });
}

beforeEach(() => clearBreakers());

describe('circuit breaker integration', () => {
  let server;

  afterEach((done) => server ? server.close(done) : done());

  test('passes through when circuit closed', (done) => {
    const mw = createCircuitBreakerMiddleware({ threshold: 3 });
    server = buildServer([mw]);
    server.listen(0, async () => {
      const res = await get(server, '/api/test');
      expect(res.status).toBe(200);
      done();
    });
  });

  test('returns 503 when circuit is open', (done) => {
    const mw = createCircuitBreakerMiddleware({ threshold: 2 });
    server = buildServer([(req, res, next) => {
      req.matchedService = { name: 'svc' };
      next();
    }, mw]);
    server.listen(0, async () => {
      const cb = getBreakerForService({ name: 'svc' }, { threshold: 2 });
      cb.recordFailure();
      cb.recordFailure();
      const res = await get(server, '/foo');
      expect(res.status).toBe(503);
      done();
    });
  });
});
