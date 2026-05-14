'use strict';

const { RequestTransformer, createRequestTransformer } = require('./request-transform');

function makeReq(url = '/foo', headers = {}) {
  return { url, headers: { ...headers } };
}

test('adds headers to request', () => {
  const t = createRequestTransformer({ addHeaders: { 'x-proxy': 'barrel', 'x-env': 'local' } });
  const req = makeReq('/test', {});
  t.transform(req);
  expect(req.headers['x-proxy']).toBe('barrel');
  expect(req.headers['x-env']).toBe('local');
});

test('removes headers from request', () => {
  const t = createRequestTransformer({ removeHeaders: ['authorization', 'cookie'] });
  const req = makeReq('/test', { authorization: 'Bearer secret', cookie: 'session=abc', accept: '*/*' });
  t.transform(req);
  expect(req.headers['authorization']).toBeUndefined();
  expect(req.headers['cookie']).toBeUndefined();
  expect(req.headers['accept']).toBe('*/*');
});

test('rewrites path prefix', () => {
  const t = createRequestTransformer({ rewritePath: { from: '/api', to: '' } });
  const req = makeReq('/api/users');
  t.transform(req);
  expect(req.url).toBe('/users');
});

test('does not rewrite path when prefix does not match', () => {
  const t = createRequestTransformer({ rewritePath: { from: '/api', to: '' } });
  const req = makeReq('/other/path');
  t.transform(req);
  expect(req.url).toBe('/other/path');
});

test('increments count on each transform', () => {
  const t = createRequestTransformer({});
  t.transform(makeReq());
  t.transform(makeReq());
  expect(t.stats().count).toBe(2);
});

test('emits transformed event', () => {
  const t = createRequestTransformer({ addHeaders: { 'x-test': '1' } });
  const events = [];
  t.on('transformed', (e) => events.push(e));
  t.transform(makeReq('/hello'));
  expect(events).toHaveLength(1);
  expect(events[0].url).toBe('/hello');
});

test('header keys are lowercased', () => {
  const t = createRequestTransformer({ addHeaders: { 'X-Custom-Header': 'value' }, removeHeaders: ['X-Remove-Me'] });
  const req = makeReq('/test', { 'x-remove-me': 'gone' });
  t.transform(req);
  expect(req.headers['x-custom-header']).toBe('value');
  expect(req.headers['x-remove-me']).toBeUndefined();
});

test('createRequestTransformer returns RequestTransformer instance', () => {
  expect(createRequestTransformer()).toBeInstanceOf(RequestTransformer);
});
