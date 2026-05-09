const { HeaderTransformer, createHeaderTransformer } = require('./header-transform');
const { clearTransformers, createHeaderTransformMiddleware } = require('./header-transform-middleware');

beforeEach(() => clearTransformers());

describe('HeaderTransformer', () => {
  test('adds x-forwarded-* headers to request', () => {
    const t = createHeaderTransformer();
    const out = t.applyToRequest({ host: 'localhost' }, '1.2.3.4');
    expect(out['x-forwarded-for']).toBe('1.2.3.4');
    expect(out['x-forwarded-host']).toBe('localhost');
    expect(out['x-forwarded-proto']).toBe('http');
  });

  test('appends to existing x-forwarded-for', () => {
    const t = createHeaderTransformer();
    const out = t.applyToRequest({ 'x-forwarded-for': '9.9.9.9' }, '1.2.3.4');
    expect(out['x-forwarded-for']).toBe('9.9.9.9, 1.2.3.4');
  });

  test('removes specified headers from request', () => {
    const t = createHeaderTransformer({ remove: ['x-secret'] });
    const out = t.applyToRequest({ 'x-secret': 'abc', host: 'localhost' }, '1.1.1.1');
    expect(out['x-secret']).toBeUndefined();
  });

  test('sets custom headers on request', () => {
    const t = createHeaderTransformer({ set: { 'x-app': 'barrel' } });
    const out = t.applyToRequest({}, '1.1.1.1');
    expect(out['x-app']).toBe('barrel');
  });

  test('applies remove and set to response headers', () => {
    const t = createHeaderTransformer({ remove: ['server'], set: { 'x-proxy': 'barrel' } });
    const out = t.applyToResponse({ server: 'nginx', 'content-type': 'text/html' });
    expect(out['server']).toBeUndefined();
    expect(out['x-proxy']).toBe('barrel');
    expect(out['content-type']).toBe('text/html');
  });

  test('emits transformed event', () => {
    const t = createHeaderTransformer();
    const events = [];
    t.on('transformed', (e) => events.push(e));
    t.applyToRequest({}, '1.1.1.1');
    t.applyToResponse({});
    expect(events).toHaveLength(2);
    expect(events[0].direction).toBe('request');
    expect(events[1].direction).toBe('response');
  });
});

describe('createHeaderTransformMiddleware', () => {
  test('mutates req.headers in place', () => {
    const service = { name: 'api', headers: { set: { 'x-via': 'barrel' } } };
    const middleware = createHeaderTransformMiddleware(service);
    const req = { headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } };
    const res = { writeHead: jest.fn() };
    let called = false;
    middleware(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.headers['x-via']).toBe('barrel');
    expect(req.headers['x-forwarded-for']).toBe('127.0.0.1');
  });
});
