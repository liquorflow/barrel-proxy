const http = require('http');
const { createHealthMiddleware, DEFAULT_HEALTH_PATH } = require('./health');
const { compose } = require('./middleware');

// Build a real HTTP server with the health middleware composed in
function buildServer(services) {
  const health = createHealthMiddleware(services, { timeout: 500 });
  const fallback = (req, res) => { res.writeHead(404).end('not found'); };
  const handler = compose([health], fallback);
  return http.createServer(handler);
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

describe('health endpoint integration', () => {
  let upstream, proxy;

  beforeAll((done) => {
    upstream = http.createServer((req, res) => res.writeHead(200).end());
    upstream.listen(0, done);
  });

  afterAll(() => {
    upstream.close();
    if (proxy) proxy.close();
  });

  it('returns 200 JSON on health path when upstream is up', (done) => {
    const port = upstream.address().port;
    const services = [{ name: 'upstream', target: `http://localhost:${port}` }];
    proxy = buildServer(services);
    proxy.listen(0, async () => {
      const { status, body } = await get(proxy.address().port, DEFAULT_HEALTH_PATH);
      expect(status).toBe(200);
      const json = JSON.parse(body);
      expect(json.ok).toBe(true);
      expect(json.services[0].name).toBe('upstream');
      done();
    });
  });

  it('falls through to 404 for unknown paths', (done) => {
    const port = upstream.address().port;
    const services = [{ name: 'upstream', target: `http://localhost:${port}` }];
    const srv = buildServer(services);
    srv.listen(0, async () => {
      const { status } = await get(srv.address().port, '/some/random/path');
      expect(status).toBe(404);
      srv.close(done);
    });
  });
});
