const http = require('http');
const { checkService, checkAll, createHealthMiddleware, DEFAULT_HEALTH_PATH } = require('./health');

// Spin up a tiny real HTTP server for integration-style checks
function makeServer(statusCode = 200) {
  const server = http.createServer((req, res) => res.writeHead(statusCode).end());
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

function makeMockRes() {
  const res = { _code: null, _body: '', _headers: {} };
  res.writeHead = (code, headers = {}) => { res._code = code; Object.assign(res._headers, headers); return res; };
  res.end = (body = '') => { res._body = body; };
  return res;
}

describe('checkService', () => {
  it('returns ok:true for a reachable service', async () => {
    const server = await makeServer(200);
    const port = server.address().port;
    const result = await checkService({ name: 'test', target: `http://localhost:${port}` });
    expect(result.ok).toBe(true);
    expect(result.name).toBe('test');
    server.close();
  });

  it('returns ok:false for an unreachable service', async () => {
    const result = await checkService({ name: 'dead', target: 'http://localhost:19999' }, 500);
    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
  });
});

describe('checkAll', () => {
  it('returns results for every service', async () => {
    const server = await makeServer(200);
    const port = server.address().port;
    const services = [
      { name: 'a', target: `http://localhost:${port}` },
      { name: 'b', target: 'http://localhost:19998' },
    ];
    const results = await checkAll(services, 500);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.name === 'a').ok).toBe(true);
    expect(results.find((r) => r.name === 'b').ok).toBe(false);
    server.close();
  });
});

describe('createHealthMiddleware', () => {
  it('calls next() for non-health paths', async () => {
    const mw = createHealthMiddleware([]);
    const next = jest.fn();
    await mw({ url: '/other' }, makeMockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('responds 200 when all services are up', async () => {
    const server = await makeServer(200);
    const port = server.address().port;
    const mw = createHealthMiddleware([{ name: 'svc', target: `http://localhost:${port}` }]);
    const res = makeMockRes();
    await mw({ url: DEFAULT_HEALTH_PATH }, res, jest.fn());
    expect(res._code).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    server.close();
  });

  it('responds 503 when a service is down', async () => {
    const mw = createHealthMiddleware([{ name: 'dead', target: 'http://localhost:19997' }], { timeout: 300 });
    const res = makeMockRes();
    await mw({ url: DEFAULT_HEALTH_PATH }, res, jest.fn());
    expect(res._code).toBe(503);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(false);
  });
});
