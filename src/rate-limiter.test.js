const { RateLimiter, createRateLimiter } = require('./rate-limiter');

test('allows requests under the limit', () => {
  const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
  const result = limiter.check('user:1');
  expect(result.allowed).toBe(true);
  expect(result.remaining).toBe(4);
});

test('blocks requests over the limit', () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60000 });
  limiter.check('user:1');
  limiter.check('user:1');
  const result = limiter.check('user:1');
  expect(result.allowed).toBe(false);
  expect(result.remaining).toBe(0);
});

test('resets window after windowMs', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 1 });
  limiter.check('user:1');
  return new Promise(resolve => setTimeout(resolve, 5)).then(() => {
    const result = limiter.check('user:1');
    expect(result.allowed).toBe(true);
  });
});

test('tracks separate keys independently', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
  limiter.check('user:1');
  const result = limiter.check('user:2');
  expect(result.allowed).toBe(true);
});

test('emits exceeded event when limit hit', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
  const events = [];
  limiter.on('exceeded', e => events.push(e));
  limiter.check('user:1');
  limiter.check('user:1');
  expect(events.length).toBe(1);
  expect(events[0].key).toBe('user:1');
});

test('reset clears a specific key', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
  limiter.check('user:1');
  limiter.reset('user:1');
  const result = limiter.check('user:1');
  expect(result.allowed).toBe(true);
});

test('getStats returns current store state', () => {
  const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
  limiter.check('user:1');
  limiter.check('user:1');
  const stats = limiter.getStats();
  expect(stats['user:1'].count).toBe(2);
});
