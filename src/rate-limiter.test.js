const { RateLimiter, createRateLimiter } = require('./rate-limiter');

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = createRateLimiter({ windowMs: 1000, max: 3 });
  });

  afterEach(() => {
    limiter.clear();
  });

  it('allows requests under the limit', () => {
    const result = limiter.hit('127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
    expect(result.remaining).toBe(2);
  });

  it('tracks multiple hits per key', () => {
    limiter.hit('127.0.0.1');
    limiter.hit('127.0.0.1');
    const result = limiter.hit('127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    limiter.hit('127.0.0.1');
    limiter.hit('127.0.0.1');
    limiter.hit('127.0.0.1');
    const result = limiter.hit('127.0.0.1');
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(4);
  });

  it('emits limited event when blocked', () => {
    const spy = jest.fn();
    limiter.on('limited', spy);
    limiter.hit('10.0.0.1');
    limiter.hit('10.0.0.1');
    limiter.hit('10.0.0.1');
    limiter.hit('10.0.0.1');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ key: '10.0.0.1' }));
  });

  it('tracks keys independently', () => {
    limiter.hit('a'); limiter.hit('a'); limiter.hit('a'); limiter.hit('a');
    const result = limiter.hit('b');
    expect(result.allowed).toBe(true);
  });

  it('resets a specific key', () => {
    limiter.hit('x'); limiter.hit('x'); limiter.hit('x'); limiter.hit('x');
    limiter.reset('x');
    const result = limiter.hit('x');
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });
});
