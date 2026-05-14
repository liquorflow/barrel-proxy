const { RequestIdPropagator, createRequestIdPropagator, createRequestIdMiddleware, getPropagatorForService, clearPropagators } = require('./request-id-propagation');

function makeReq(headers = {}) {
  return { headers, url: '/test' };
}

function makeMockRes() {
  const headers = {};
  return {
    headers,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(code, hdrs) { this.statusCode = code; Object.assign(this.headers, hdrs || {}); },
    end(body) { this.body = body; }
  };
}

test('generates an id if none present', () => {
  const p = createRequestIdPropagator();
  const req = makeReq();
  const id = p.process(req);
  expect(id).toBeTruthy();
  expect(req.headers['x-request-id']).toBe(id);
});

test('preserves existing id when override is false', () => {
  const p = createRequestIdPropagator();
  const req = makeReq({ 'x-request-id': 'existing-123' });
  const id = p.process(req);
  expect(id).toBe('existing-123');
});

test('overrides existing id when override is true', () => {
  const p = createRequestIdPropagator({ override: true });
  const req = makeReq({ 'x-request-id': 'old-id' });
  const id = p.process(req);
  expect(id).not.toBe('old-id');
});

test('uses custom header name', () => {
  const p = createRequestIdPropagator({ header: 'x-trace-id' });
  const req = makeReq();
  p.process(req);
  expect(req.headers['x-trace-id']).toBeTruthy();
});

test('uses custom generate function', () => {
  const p = createRequestIdPropagator({ generate: () => 'fixed-id' });
  const req = makeReq();
  const id = p.process(req);
  expect(id).toBe('fixed-id');
});

test('emits existing event when id found and not overriding', () => {
  const p = createRequestIdPropagator();
  const events = [];
  p.on('existing', e => events.push(e));
  const req = makeReq({ 'x-request-id': 'abc' });
  p.process(req);
  expect(events).toHaveLength(1);
  expect(events[0].id).toBe('abc');
});

test('emits generated event for new ids', () => {
  const p = createRequestIdPropagator();
  const events = [];
  p.on('generated', e => events.push(e));
  p.process(makeReq());
  expect(events).toHaveLength(1);
});

test('middleware sets header on response and attaches id to req', () => {
  const mw = createRequestIdMiddleware();
  const req = makeReq();
  const res = makeMockRes();
  let called = false;
  mw(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(req._requestId).toBeTruthy();
  expect(res.headers['x-request-id']).toBe(req._requestId);
});

test('getPropagatorForService returns same instance', () => {
  clearPropagators();
  const a = getPropagatorForService('svc-a');
  const b = getPropagatorForService('svc-a');
  expect(a).toBe(b);
});

test('clearPropagators resets instances', () => {
  const a = getPropagatorForService('svc-b');
  clearPropagators();
  const b = getPropagatorForService('svc-b');
  expect(a).not.toBe(b);
});
