const { TimeoutHandler, createTimeoutHandler } = require('./timeout');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('TimeoutHandler', () => {
  it('resolves when fn completes in time', async () => {
    const handler = createTimeoutHandler({ timeoutMs: 100 });
    const wrapped = handler.wrap(() => Promise.resolve('ok'));
    const result = await wrapped();
    expect(result).toBe('ok');
    expect(handler.stats().total).toBe(1);
    expect(handler.stats().timeouts).toBe(0);
  });

  it('rejects with ETIMEOUT when fn takes too long', async () => {
    const handler = createTimeoutHandler({ timeoutMs: 20 });
    const wrapped = handler.wrap(() => delay(100));
    await expect(wrapped()).rejects.toMatchObject({ code: 'ETIMEOUT' });
    expect(handler.stats().timeouts).toBe(1);
  });

  it('emits timeout event on timeout', async () => {
    const handler = createTimeoutHandler({ timeoutMs: 20 });
    const events = [];
    handler.on('timeout', (e) => events.push(e));
    const wrapped = handler.wrap(() => delay(100));
    await wrapped().catch(() => {});
    expect(events.length).toBe(1);
    expect(events[0].timeoutMs).toBe(20);
  });

  it('rejects if fn itself rejects', async () => {
    const handler = createTimeoutHandler({ timeoutMs: 100 });
    const wrapped = handler.wrap(() => Promise.reject(new Error('boom')));
    await expect(wrapped()).rejects.toThrow('boom');
    expect(handler.stats().timeouts).toBe(0);
  });

  it('uses default timeout when not specified', () => {
    const handler = createTimeoutHandler();
    expect(handler.stats().timeoutMs).toBe(30000);
  });

  it('tracks total calls', async () => {
    const handler = createTimeoutHandler({ timeoutMs: 100 });
    const wrapped = handler.wrap(() => Promise.resolve());
    await wrapped();
    await wrapped();
    expect(handler.stats().total).toBe(2);
  });
});
