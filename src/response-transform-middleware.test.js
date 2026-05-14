const { createResponseTransformMiddleware, createResponseTransformStatusRoute, clearTransformers } = require('./response-transform-middleware');

function makeMockRes() {
  const res = {
    _headers: {},
    _body: null,
    _status: 200,
    writeHead(code, headers) { this._status = code; this._headers = headers || {}; },
    write(chunk) { this._body = chunk; },
    end(chunk) { if (chunk) this._body = chunk; },
  };
  return res;
}

function makeMockReq() {
  return { method: 'GET', url: '/', headers: {} };
}

beforeEach(() => clearTransformers());

describe('createResponseTransformMiddleware', () => {
  it('calls next when disabled', () => {
    const service = { name: 'svc', responseTransform: { enabled: false } };
    const mw = createResponseTransformMiddleware(service);
    const req = makeMockReq();
    const res = makeMockRes();
    let called = false;
    mw(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it('intercepts writeHead and end to transform headers', () => {
    const service = { name: 'svc2', responseTransform: { addHeaders: { 'x-proxy': 'barrel' }, removeHeaders: ['server'] } };
    const mw = createResponseTransformMiddleware(service);
    const req = makeMockReq();
    const res = makeMockRes();
    mw(req, res, () => {});
    res.writeHead(200, { server: 'nginx', 'content-type': 'text/plain' });
    res.end(Buffer.from('hello'));
    expect(res._headers['x-proxy']).toBe('barrel');
    expect(res._headers['server']).toBeUndefined();
  });

  it('rewrites body content', () => {
    const service = { name: 'svc3', responseTransform: { rewriteBody: { search: 'hello', replace: 'world' } } };
    const mw = createResponseTransformMiddleware(service);
    const req = makeMockReq();
    const res = makeMockRes();
    mw(req, res, () => {});
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(Buffer.from('hello there'));
    expect(res._body.toString()).toBe('world there');
  });
});

describe('createResponseTransformStatusRoute', () => {
  it('returns json status for all services', () => {
    const services = [
      { name: 'a', responseTransform: { addHeaders: { 'x-a': '1' } } },
      { name: 'b', responseTransform: {} },
    ];
    const route = createResponseTransformStatusRoute(services);
    const res = makeMockRes();
    route({}, res);
    const body = JSON.parse(res._body);
    expect(body).toHaveLength(2);
    expect(body[0].service).toBe('a');
    expect(body[1].service).toBe('b');
  });
});
