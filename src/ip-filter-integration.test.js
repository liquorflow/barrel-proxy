const http = require('http');
const { createIpFilterMiddleware, clearFilters } = require('./ip-filter-middleware');

function buildServer(service) {
  const mw = createIpFilterMiddleware(service);
  return http.createServer((req, res) => {
    mw(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  });
}

function get(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const { address, port } = server.address();
    const options = { hostname: address === '::' ? '127.0.0.1' : address, port, path, headers };
    http.get(options, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

beforeEach(() => clearFilters());

test('allows all requests when no ipFilter configured', async () => {
  const server = buildServer({ name: 'open', target: 'http://localhost:9000' });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const res = await get(server, '/');
  expect(res.status).toBe(200);
  expect(res.body).toBe('ok');
  await new Promise(r => server.close(r));
});

test('blocks request from non-allowed ip via x-forwarded-for', async () => {
  const service = { name: 'strict', ipFilter: { allow: ['10.0.0.1'], mode: 'allow' } };
  const server = buildServer(service);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const res = await get(server, '/', { 'x-forwarded-for': '8.8.8.8' });
  expect(res.status).toBe(403);
  await new Promise(r => server.close(r));
});

test('allows request from allowed ip via x-forwarded-for', async () => {
  const service = { name: 'strict2', ipFilter: { allow: ['8.8.8.8'], mode: 'allow' } };
  const server = buildServer(service);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const res = await get(server, '/', { 'x-forwarded-for': '8.8.8.8' });
  expect(res.status).toBe(200);
  await new Promise(r => server.close(r));
});
