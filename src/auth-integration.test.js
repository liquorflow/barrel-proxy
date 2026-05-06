const http = require('http');
const { createAuthMiddleware } = require('./auth-middleware');
const { clearGuard } = require('./auth-middleware');

beforeEach(() => clearGuard());

function buildServer(tokens) {
  const auth = createAuthMiddleware({ tokens });
  return http.createServer((req, res) => {
    auth(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
}

function get(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request({ host: '127.0.0.1', port, path, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('auth integration', () => {
  let server;

  beforeEach(done => {
    server = buildServer(['integration-token']);
    server.listen(0, '127.0.0.1', done);
  });

  afterEach(done => server.close(done));

  test('allows request with valid token', async () => {
    const res = await get(server, '/', { authorization: 'Bearer integration-token' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('rejects request without token', async () => {
    const res = await get(server, '/');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('rejects request with wrong token', async () => {
    const res = await get(server, '/', { authorization: 'Bearer badtoken' });
    expect(res.status).toBe(401);
  });
});
