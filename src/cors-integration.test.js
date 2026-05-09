const http = require('http');
const { createCorsMiddleware } = require('./cors');
const { compose } = require('./middleware');

function buildServer(corsOptions = {}) {
  const corsMiddleware = createCorsMiddleware(corsOptions);
  const handler = compose([corsMiddleware], (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  return http.createServer(handler);
}

function request(server, opts = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', path = '/', headers = {} } = opts;
    const addr = server.address();
    const options = { hostname: '127.0.0.1', port: addr.port, path, method, headers };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}

let server;

beforeEach((done) => {
  server = buildServer({ origins: ['http://example.com'], methods: ['GET', 'POST'] });
  server.listen(0, '127.0.0.1', done);
});

afterEach((done) => server.close(done));

test('adds CORS headers for allowed origin', async () => {
  const res = await request(server, { headers: { origin: 'http://example.com' } });
  expect(res.status).toBe(200);
  expect(res.headers['access-control-allow-origin']).toBe('http://example.com');
});

test('does not add CORS headers for disallowed origin', async () => {
  const res = await request(server, { headers: { origin: 'http://evil.com' } });
  expect(res.status).toBe(200);
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
});

test('handles preflight OPTIONS request', async () => {
  const res = await request(server, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://example.com',
      'access-control-request-method': 'POST'
    }
  });
  expect(res.status).toBe(204);
  expect(res.headers['access-control-allow-methods']).toContain('POST');
});

test('wildcard origin allows all origins', async () => {
  const wildServer = buildServer({ origins: ['*'] });
  await new Promise((r) => wildServer.listen(0, '127.0.0.1', r));
  try {
    const res = await request(wildServer, { headers: { origin: 'http://anything.io' } });
    expect(res.headers['access-control-allow-origin']).toBe('*');
  } finally {
    await new Promise((r) => wildServer.close(r));
  }
});
