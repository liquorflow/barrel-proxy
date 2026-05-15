'use strict';

const { createRequestDedup } = require('./request-dedup');

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

test('returns the same promise for duplicate in-flight keys', async () => {
  const dedup = createRequestDedup();
  let calls = 0;
  const factory = () => { calls++; return delay(30).then(() => 'result'); };

  const p1 = dedup.register('key1', factory);
  const p2 = dedup.register('key1', factory);

  expect(p1).toBe(p2);
  const [r1, r2] = await Promise.all([p1, p2]);
  expect(r1).toBe('result');
  expect(r2).toBe('result');
  expect(calls).toBe(1);
});

test('allows new request after previous resolves', async () => {
  const dedup = createRequestDedup();
  let calls = 0;
  const factory = () => { calls++; return Promise.resolve(calls); };

  await dedup.register('k', factory);
  await dedup.register('k', factory);

  expect(calls).toBe(2);
});

test('emits dedup event for collapsed requests', async () => {
  const dedup = createRequestDedup();
  const events = [];
  dedup.on('dedup', (key) => events.push(key));

  const factory = () => delay(20).then(() => 'ok');
  dedup.register('dup', factory);
  dedup.register('dup', factory);
  dedup.register('dup', factory);

  await delay(40);
  expect(events).toEqual(['dup', 'dup']);
});

test('propagates rejection to all waiters', async () => {
  const dedup = createRequestDedup();
  const err = new Error('upstream fail');
  const factory = () => delay(10).then(() => { throw err; });

  const p1 = dedup.register('fail', factory);
  const p2 = dedup.register('fail', factory);

  await expect(p1).rejects.toThrow('upstream fail');
  await expect(p2).rejects.toThrow('upstream fail');
});

test('TTL expiry rejects the promise', async () => {
  const dedup = createRequestDedup({ ttl: 20 });
  const factory = () => delay(200).then(() => 'late');

  await expect(dedup.register('ttl', factory)).rejects.toThrow('Dedup TTL expired');
  expect(dedup.size).toBe(0);
});

test('clear() rejects all in-flight entries', async () => {
  const dedup = createRequestDedup();
  const factory = () => delay(500).then(() => 'never');

  const p = dedup.register('c', factory);
  dedup.clear();

  await expect(p).rejects.toThrow('Dedup cleared');
  expect(dedup.size).toBe(0);
});
