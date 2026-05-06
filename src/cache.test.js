const { ResponseCache, createCache } = require('./cache');

function makeReq(method = 'GET', url = '/foo') {
  return { method, url };
}

test('createCache returns a ResponseCache instance', () => {
  const c = createCache();
  expect(c).toBeInstanceOf(ResponseCache);
});

test('get returns null for unknown key', () => {
  const c = createCache();
  expect(c.get(makeReq())).toBeNull();
});

test('set and get a cached entry', () => {
  const c = createCache();
  const req = makeReq();
  c.set(req, 200, { 'content-type': 'text/plain' }, Buffer.from('hello'));
  const entry = c.get(req);
  expect(entry).not.toBeNull();
  expect(entry.status).toBe(200);
  expect(entry.body.toString()).toBe('hello');
});

test('expired entries are not returned', (done) => {
  const c = createCache({ maxAge: 10 });
  c.set(makeReq(), 200, {}, Buffer.from('x'));
  setTimeout(() => {
    expect(c.get(makeReq())).toBeNull();
    done();
  }, 20);
});

test('emits hit event on cache hit', () => {
  const c = createCache();
  const hits = [];
  c.on('hit', (k) => hits.push(k));
  c.set(makeReq(), 200, {}, Buffer.from('y'));
  c.get(makeReq());
  expect(hits.length).toBe(1);
});

test('evicts oldest entry when maxSize exceeded', () => {
  const c = createCache({ maxSize: 2 });
  c.set(makeReq('GET', '/a'), 200, {}, Buffer.from('a'));
  c.set(makeReq('GET', '/b'), 200, {}, Buffer.from('b'));
  c.set(makeReq('GET', '/c'), 200, {}, Buffer.from('c'));
  expect(c.size()).toBe(2);
});

test('invalidate removes matching keys', () => {
  const c = createCache();
  c.set(makeReq('GET', '/api/users'), 200, {}, Buffer.from('u'));
  c.set(makeReq('GET', '/api/posts'), 200, {}, Buffer.from('p'));
  c.invalidate('/api/users');
  expect(c.size()).toBe(1);
});

test('clear removes all entries', () => {
  const c = createCache();
  c.set(makeReq(), 200, {}, Buffer.from('z'));
  c.clear();
  expect(c.size()).toBe(0);
});
