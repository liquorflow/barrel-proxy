const { StickySessionRouter, createStickySessionRouter } = require('./sticky-session');

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

test('binds a session to a target', () => {
  const r = createStickySessionRouter();
  r.bind('abc', 'http://localhost:3001');
  expect(r.getTarget('abc')).toBe('http://localhost:3001');
  r.stop();
});

test('returns null for unknown session', () => {
  const r = createStickySessionRouter();
  expect(r.getTarget('nope')).toBeNull();
  r.stop();
});

test('releases a session', () => {
  const r = createStickySessionRouter();
  r.bind('abc', 'http://localhost:3001');
  r.release('abc');
  expect(r.getTarget('abc')).toBeNull();
  r.stop();
});

test('expires sessions past ttl', async () => {
  const r = createStickySessionRouter({ ttl: 10 });
  r.bind('abc', 'http://localhost:3001');
  await delay(20);
  expect(r.getTarget('abc')).toBeNull();
  r.stop();
});

test('emits bind event', () => {
  const r = createStickySessionRouter();
  const events = [];
  r.on('bind', e => events.push(e));
  r.bind('abc', 'http://localhost:3001');
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ sessionId: 'abc', target: 'http://localhost:3001' });
  r.stop();
});

test('emits release event', () => {
  const r = createStickySessionRouter();
  const events = [];
  r.on('release', e => events.push(e));
  r.bind('abc', 'http://localhost:3001');
  r.release('abc');
  expect(events).toHaveLength(1);
  r.stop();
});

test('generateId returns unique hex strings', () => {
  const r = createStickySessionRouter();
  const a = r.generateId();
  const b = r.generateId();
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).not.toBe(b);
  r.stop();
});

test('prune removes expired entries and emits event', async () => {
  const r = createStickySessionRouter({ ttl: 5 });
  const pruneEvents = [];
  r.on('prune', e => pruneEvents.push(e));
  r.bind('x', 'http://localhost:3001');
  await delay(15);
  r._prune();
  expect(r.sessions.size).toBe(0);
  expect(pruneEvents[0].count).toBe(1);
  r.stop();
});
