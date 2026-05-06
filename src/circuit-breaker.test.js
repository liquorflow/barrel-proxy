const { CircuitBreaker, createCircuitBreaker, STATE } = require('./circuit-breaker');

describe('CircuitBreaker', () => {
  let cb;

  beforeEach(() => {
    cb = createCircuitBreaker({ threshold: 3, timeout: 1000 });
  });

  test('starts closed', () => {
    expect(cb.state).toBe(STATE.CLOSED);
    expect(cb.isOpen()).toBe(false);
  });

  test('opens after threshold failures', () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.state).toBe(STATE.OPEN);
    expect(cb.isOpen()).toBe(true);
  });

  test('emits open event', () => {
    const handler = jest.fn();
    cb.on('open', handler);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(handler).toHaveBeenCalledWith({ failures: 3 });
  });

  test('transitions to half_open after timeout', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.lastFailureTime = Date.now() - 2000;
    expect(cb.isOpen()).toBe(false);
    expect(cb.state).toBe(STATE.HALF_OPEN);
  });

  test('closes on success', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.state).toBe(STATE.CLOSED);
    expect(cb.failures).toBe(0);
  });

  test('reset clears state', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.reset();
    expect(cb.state).toBe(STATE.CLOSED);
    expect(cb.failures).toBe(0);
  });

  test('getState returns snapshot', () => {
    cb.recordFailure();
    const s = cb.getState();
    expect(s.failures).toBe(1);
    expect(s.state).toBe(STATE.CLOSED);
  });
});
