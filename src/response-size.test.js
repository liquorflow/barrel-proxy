const { ResponseSizeGuard, createResponseSizeGuard } = require('./response-size');

describe('ResponseSizeGuard', () => {
  let guard;

  beforeEach(() => {
    guard = createResponseSizeGuard({ maxBytes: 1000, warnBytes: 500 });
  });

  test('allows response within limit', () => {
    const result = guard.check(200);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('ok');
  });

  test('blocks response exceeding maxBytes', () => {
    const result = guard.check(2000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('exceeded');
    expect(result.bytes).toBe(2000);
    expect(result.maxBytes).toBe(1000);
  });

  test('allows unknown content-length', () => {
    expect(guard.check(null).reason).toBe('unknown');
    expect(guard.check(undefined).reason).toBe('unknown');
  });

  test('allows unparseable content-length', () => {
    const result = guard.check('chunked');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('unparseable');
  });

  test('emits blocked event when exceeded', () => {
    const spy = jest.fn();
    guard.on('blocked', spy);
    guard.check(5000);
    expect(spy).toHaveBeenCalledWith({ bytes: 5000, maxBytes: 1000 });
  });

  test('emits warn event when above warnBytes', () => {
    const spy = jest.fn();
    guard.on('warn', spy);
    guard.check(600);
    expect(spy).toHaveBeenCalledWith({ bytes: 600, warnBytes: 500 });
  });

  test('does not emit warn when warnBytes not configured', () => {
    const g = createResponseSizeGuard({ maxBytes: 1000 });
    const spy = jest.fn();
    g.on('warn', spy);
    g.check(600);
    expect(spy).not.toHaveBeenCalled();
  });

  test('tracks stats correctly', () => {
    guard.check(200);
    guard.check(600);
    guard.check(2000);
    const stats = guard.getStats();
    expect(stats.checked).toBe(3);
    expect(stats.warned).toBe(1);
    expect(stats.blocked).toBe(1);
  });

  test('uses 10MB default maxBytes', () => {
    const g = createResponseSizeGuard();
    expect(g.maxBytes).toBe(10 * 1024 * 1024);
  });
});
