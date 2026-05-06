const { RetryHandler, createRetryHandler } = require('./retry');

function makeError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

test('createRetryHandler returns RetryHandler instance', () => {
  const handler = createRetryHandler();
  expect(handler).toBeInstanceOf(RetryHandler);
});

test('getConfig returns maxAttempts and delay', () => {
  const handler = createRetryHandler({ maxAttempts: 5, delay: 100 });
  expect(handler.getConfig()).toEqual({ maxAttempts: 5, delay: 100 });
});

test('execute resolves immediately on success', async () => {
  const handler = createRetryHandler({ delay: 0 });
  const result = await handler.execute(async () => 'ok');
  expect(result).toBe('ok');
});

test('execute retries on retryable error and eventually succeeds', async () => {
  const handler = createRetryHandler({ maxAttempts: 3, delay: 0 });
  let calls = 0;
  const retries = [];
  handler.on('retry', ({ attempt }) => retries.push(attempt));
  const result = await handler.execute(async () => {
    calls++;
    if (calls < 3) throw makeError('ECONNREFUSED');
    return 'done';
  });
  expect(result).toBe('done');
  expect(calls).toBe(3);
  expect(retries).toEqual([1, 2]);
});

test('execute throws after exhausting attempts', async () => {
  const handler = createRetryHandler({ maxAttempts: 2, delay: 0 });
  let exhausted = false;
  handler.on('exhausted', () => { exhausted = true; });
  await expect(
    handler.execute(async () => { throw makeError('ECONNRESET'); })
  ).rejects.toMatchObject({ code: 'ECONNRESET' });
  expect(exhausted).toBe(true);
});

test('execute does not retry non-retryable errors', async () => {
  const handler = createRetryHandler({ maxAttempts: 3, delay: 0 });
  let calls = 0;
  await expect(
    handler.execute(async () => {
      calls++;
      throw makeError('ENOENT');
    })
  ).rejects.toMatchObject({ code: 'ENOENT' });
  expect(calls).toBe(1);
});

test('execute uses custom shouldRetry predicate', async () => {
  const handler = createRetryHandler({
    maxAttempts: 3,
    delay: 0,
    shouldRetry: (err) => err.code === 'CUSTOM',
  });
  let calls = 0;
  const result = await handler.execute(async () => {
    calls++;
    if (calls < 2) throw makeError('CUSTOM');
    return 'custom-ok';
  });
  expect(result).toBe('custom-ok');
  expect(calls).toBe(2);
});
