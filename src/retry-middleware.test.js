const {
  createRetryMiddleware,
  createRetryStatusRoute,
  clearRetryHandlers,
  getRetryHandlerForService,
} = require('./retry-middleware');

function makeMockRes() {
  const res = { headers: {}, body: null, statusCode: null };
  res.writeHead = (code, headers) => {
    res.statusCode = code;
    Object.assign(res.headers, headers);
  };
  res.end = (data) => { res.body = data; };
  return res;
}

function makeMockReq(target) {
  return { matchedService: target, url: '/test', method: 'GET' };
}

beforeEach(() => clearRetryHandlers());

test('createRetryMiddleware calls next when no matched service', () => {
  const middleware = createRetryMiddleware([]);
  const req = makeMockReq('http://localhost:3001');
  const res = makeMockRes();
  let called = false;
  middleware(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(req.retryHandler).toBeUndefined();
});

test('createRetryMiddleware attaches retryHandler for matched service', () => {
  const services = [{ target: 'http://localhost:3001' }];
  const middleware = createRetryMiddleware(services);
  const req = makeMockReq('http://localhost:3001');
  const res = makeMockRes();
  let called = false;
  middleware(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(req.retryHandler).toBeDefined();
});

test('getRetryHandlerForService returns same handler for same target', () => {
  const service = { target: 'http://localhost:4000' };
  const h1 = getRetryHandlerForService(service);
  const h2 = getRetryHandlerForService(service);
  expect(h1).toBe(h2);
});

test('createRetryStatusRoute returns JSON with retry info', () => {
  const services = [{ target: 'http://localhost:3001' }];
  getRetryHandlerForService(services[0]);
  const route = createRetryStatusRoute(services);
  const req = {};
  const res = makeMockRes();
  route(req, res);
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  expect(body.retries).toHaveLength(1);
  expect(body.retries[0].service).toBe('http://localhost:3001');
});

test('createRetryStatusRoute handles service with no handler yet', () => {
  const services = [{ target: 'http://localhost:9999' }];
  const route = createRetryStatusRoute(services);
  const res = makeMockRes();
  route({}, res);
  const body = JSON.parse(res.body);
  expect(body.retries[0].config).toBeNull();
});
