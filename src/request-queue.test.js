const { RequestQueue, createRequestQueue } = require('./request-queue');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

test('processes tasks up to concurrency limit', async () => {
  const q = createRequestQueue({ concurrency: 2 });
  let running = 0;
  let maxRunning = 0;
  const task = () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    return delay(20).then(() => { running--; });
  };
  await Promise.all([q.enqueue(task), q.enqueue(task), q.enqueue(task)]);
  expect(maxRunning).toBe(2);
});

test('resolves with task return value', async () => {
  const q = createRequestQueue({ concurrency: 1 });
  const result = await q.enqueue(() => Promise.resolve(42));
  expect(result).toBe(42);
});

test('rejects when task throws', async () => {
  const q = createRequestQueue({ concurrency: 1 });
  await expect(q.enqueue(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
});

test('times out queued tasks that wait too long', async () => {
  const q = createRequestQueue({ concurrency: 1, timeout: 30 });
  const slow = () => delay(200);
  q.enqueue(slow);
  const second = q.enqueue(() => Promise.resolve('ok'));
  await expect(second).rejects.toMatchObject({ code: 'QUEUE_TIMEOUT' });
});

test('emits queued and done events', async () => {
  const q = createRequestQueue({ concurrency: 1 });
  const events = [];
  q.on('queued', () => events.push('queued'));
  q.on('done', () => events.push('done'));
  await q.enqueue(() => Promise.resolve());
  expect(events).toContain('queued');
  expect(events).toContain('done');
});

test('stats returns active and pending counts', async () => {
  const q = createRequestQueue({ concurrency: 1 });
  const p = q.enqueue(() => delay(50));
  q.enqueue(() => delay(50));
  await delay(10);
  const s = q.stats();
  expect(s.active).toBe(1);
  expect(s.pending).toBe(1);
  await p;
});

test('createRequestQueue returns a RequestQueue instance', () => {
  expect(createRequestQueue()).toBeInstanceOf(RequestQueue);
});
