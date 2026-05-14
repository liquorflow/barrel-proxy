const { createRequestTransformMiddleware, createRequestTransformStatusRoute, clearTransformers } = require('./request-transform-middleware');

function makeMockRes() {
  const res = { _status: 200, _headers: {}, _body: null };
  res.writeHead = (status, headers) => { res._status = status; Object.assign(res._headers, headers); };
  res.end = (body) => { res._body = body; };
  return res;
}

function makeMockReq(overrides = {}) {
  return { method: 'GET', url: '/api/foo', headers: {}, ...overrides };
}

beforeEach(() => clearTransformers());

test('passes through when no transform config', () => {
  const service = { name: 'svc', target: 'http://localhost:3001' };
  const mw = createRequestTransformMiddleware(service);
  const req = makeMockReq();
  const next = jest.fn();
  mw(req, {}, next);
  expect(next).toHaveBeenCalledWith();
});

test('applies header overrides', () => {
  const service = { name: 'svc', requestTransform: { headers: { 'x-custom': 'hello' } } };
  const mw = createRequestTransformMiddleware(service);
  const req = makeMockReq();
  const next = jest.fn();
  mw(req, {}, next);
  expect(req.headers['x-custom']).toBe('hello');
  expect(next).toHaveBeenCalledWith();
});

test('removes header when value is null', () => {
  const service = { name: 'svc2', requestTransform: { headers: { 'x-remove': null } } };
  const mw = createRequestTransformMiddleware(service);
  const req = makeMockReq({ headers: { 'x-remove': 'bye' } });
  const next = jest.fn();
  mw(req, {}, next);
  expect(req.headers['x-remove']).toBeUndefined();
});

test('rewrites path', () => {
  const service = { name: 'svc3', requestTransform: { rewritePath: { from: '^/api', to: '' } } };
  const mw = createRequestTransformMiddleware(service);
  const req = makeMockReq({ url: '/api/users' });
  const next = jest.fn();
  mw(req, {}, next);
  expect(req.url).toBe('/users');
});

test('overrides method', () => {
  const service = { name: 'svc4', requestTransform: { setMethod: 'post' } };
  const mw = createRequestTransformMiddleware(service);
  const req = makeMockReq({ method: 'GET' });
  const next = jest.fn();
  mw(req, {}, next);
  expect(req.method).toBe('POST');
});

test('status route returns transform config per service', () => {
  const services = [
    { name: 'a', requestTransform: { headers: { 'x-env': 'prod' } } },
    { name: 'b', target: 'http://localhost:4000' }
  ];
  const route = createRequestTransformStatusRoute(services);
  const res = makeMockRes();
  route({}, res);
  const body = JSON.parse(res._body);
  expect(body.requestTransforms).toHaveLength(2);
  expect(body.requestTransforms[0].service).toBe('a');
  expect(body.requestTransforms[0].config.headers['x-env']).toBe('prod');
});
