const { createIpFilterMiddleware, createIpFilterStatusRoute, clearFilters } = require('./ip-filter-middleware');

function makeMockRes() {
  const res = { code: null, body: null, headers: {} };
  res.writeHead = (code, headers) => { res.code = code; Object.assign(res.headers, headers || {}); };
  res.end = (body) => { res.body = body; };
  return res;
}

function makeMockReq(ip, forwarded) {
  return {
    headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
    socket: { remoteAddress: ip || '127.0.0.1' }
  };
}

beforeEach(() => clearFilters());

test('passes through when no ipFilter config', done => {
  const mw = createIpFilterMiddleware({ name: 'svc', target: 'http://localhost:3000' });
  const req = makeMockReq('1.2.3.4');
  const res = makeMockRes();
  mw(req, res, done);
});

test('allows whitelisted ip in allow-mode', done => {
  const service = { name: 'svc', target: 'http://localhost:3000', ipFilter: { allow: ['192.168.1.1'], mode: 'allow' } };
  const mw = createIpFilterMiddleware(service);
  const req = makeMockReq('192.168.1.1');
  const res = makeMockRes();
  mw(req, res, done);
});

test('blocks non-whitelisted ip in allow-mode', () => {
  const service = { name: 'svc2', target: 'http://localhost:3000', ipFilter: { allow: ['192.168.1.1'], mode: 'allow' } };
  const mw = createIpFilterMiddleware(service);
  const req = makeMockReq('10.0.0.1');
  const res = makeMockRes();
  mw(req, res, () => { throw new Error('should not call next'); });
  expect(res.code).toBe(403);
});

test('reads ip from x-forwarded-for header', done => {
  const service = { name: 'svc3', ipFilter: { allow: ['5.5.5.5'], mode: 'allow' } };
  const mw = createIpFilterMiddleware(service);
  const req = makeMockReq(null, '5.5.5.5, 10.0.0.1');
  const res = makeMockRes();
  mw(req, res, done);
});

test('status route returns service ip filter config', () => {
  const services = [
    { name: 'a', ipFilter: { allow: ['1.1.1.1'] } },
    { name: 'b' }
  ];
  const route = createIpFilterStatusRoute(services);
  const res = makeMockRes();
  route({}, res);
  expect(res.code).toBe(200);
  const data = JSON.parse(res.body);
  expect(data.ipFilters).toHaveLength(2);
  expect(data.ipFilters[0].service).toBe('a');
  expect(data.ipFilters[1].ipFilter).toBeNull();
});
