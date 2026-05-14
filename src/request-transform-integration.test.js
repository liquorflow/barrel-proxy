const http = require('http');
const { createRequestTransformMiddleware, clearTransformers } = require('./request-transform-middleware');

beforeEach(() => clearTransformers());

function buildServer(service) {
  const mw = createRequestTransformMiddleware(service);
  return http.createServer((req, res) => {
    mw(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers
      }));
    });
  });
}

function get(server, path) {
  return new Promise((resolve, reject) => {
    const { address, port } = server.address();
    const req = http.request({ host: address, port, path, method: 'GET' }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('integration: header injection visible in handler', done => {
  const service = { name: 'int-svc', requestTransform: { headers: { 'x-injected': 'yes' } } };
  const server = buildServer(service);
  server.listen(0, '127.0.0.1', async () => {
    try {
      const { body } = await get(server, '/ping');
      expect(body.headers['x-injected']).toBe('yes');
    } finally {
      server.close(done);
    }
  });
});

test('integration: path rewrite visible in handler', done => {
  const service = { name: 'int-svc2', requestTransform: { rewritePath: { from: '^/v1', to: '/v2' } } };
  const server = buildServer(service);
  server.listen(0, '127.0.0.1', async () => {
    try {
      const { body } = await get(server, '/v1/resource');
      expect(body.url).toBe('/v2/resource');
    } finally {
      server.close(done);
    }
  });
});
