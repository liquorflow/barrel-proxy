const { RequestSizeGuard, createRequestSizeGuard } = require('./request-size');

function makeReq(contentLength, url = '/test') {
  return {
    url,
    headers: contentLength !== undefined ? { 'content-length': String(contentLength) } : {},
  };
}

test('allows request within size limit', () => {
  const guard = createRequestSizeGuard({ maxBytes: 1000 });
  const result = guard.check(makeReq(500));
  expect(result).toBe(true);
  expect(guard.stats().allowed).toBe(1);
  expect(guard.stats().blocked).toBe(0);
});

test('blocks request exceeding size limit', () => {
  const guard = createRequestSizeGuard({ maxBytes: 1000 });
  const result = guard.check(makeReq(2000));
  expect(result).toBe(false);
  expect(guard.stats().blocked).toBe(1);
  expect(guard.stats().allowed).toBe(0);
});

test('allows request with no content-length header', () => {
  const guard = createRequestSizeGuard({ maxBytes: 1000 });
  const result = guard.check(makeReq(undefined));
  expect(result).toBe(true);
});

test('emits blocked event when request is too large', () => {
  const guard = createRequestSizeGuard({ maxBytes: 500 });
  const events = [];
  guard.on('blocked', (data) => events.push(data));
  guard.check(makeReq(1000));
  expect(events).toHaveLength(1);
  expect(events[0].contentLength).toBe(1000);
  expect(events[0].maxBytes).toBe(500);
});

test('emits allowed event when request is within limit', () => {
  const guard = createRequestSizeGuard({ maxBytes: 500 });
  const events = [];
  guard.on('allowed', (data) => events.push(data));
  guard.check(makeReq(100));
  expect(events).toHaveLength(1);
});

test('reset clears counters', () => {
  const guard = createRequestSizeGuard({ maxBytes: 500 });
  guard.check(makeReq(100));
  guard.check(makeReq(1000));
  guard.reset();
  const stats = guard.stats();
  expect(stats.allowed).toBe(0);
  expect(stats.blocked).toBe(0);
});

test('defaults to 1MB max size', () => {
  const guard = createRequestSizeGuard();
  expect(guard.maxBytes).toBe(1024 * 1024);
});
