"use strict";

const { RetryHandler, createRetryHandler, DEFAULT_OPTIONS } = require("./retry");

describe("RetryHandler", () => {
  let handler;

  beforeEach(() => {
    handler = createRetryHandler();
  });

  test("uses default options", () => {
    expect(handler.options.maxAttempts).toBe(DEFAULT_OPTIONS.maxAttempts);
    expect(handler.options.initialDelay).toBe(DEFAULT_OPTIONS.initialDelay);
    expect(handler.options.retryOn).toEqual(DEFAULT_OPTIONS.retryOn);
  });

  test("merges custom options with defaults", () => {
    const h = createRetryHandler({ maxAttempts: 5, initialDelay: 50 });
    expect(h.options.maxAttempts).toBe(5);
    expect(h.options.initialDelay).toBe(50);
    expect(h.options.backoffFactor).toBe(DEFAULT_OPTIONS.backoffFactor);
  });

  test("shouldRetry returns true for configured status codes", () => {
    expect(handler.shouldRetry(502)).toBe(true);
    expect(handler.shouldRetry(503)).toBe(true);
    expect(handler.shouldRetry(504)).toBe(true);
  });

  test("shouldRetry returns false for non-retry status codes", () => {
    expect(handler.shouldRetry(200)).toBe(false);
    expect(handler.shouldRetry(404)).toBe(false);
    expect(handler.shouldRetry(500)).toBe(false);
  });

  test("getDelay applies exponential backoff", () => {
    expect(handler.getDelay(1)).toBe(100);
    expect(handler.getDelay(2)).toBe(200);
    expect(handler.getDelay(3)).toBe(400);
  });

  test("getDelay does not exceed maxDelay", () => {
    expect(handler.getDelay(100)).toBe(handler.options.maxDelay);
  });

  test("increment tracks attempts per requestId", () => {
    expect(handler.getAttempts("req-1")).toBe(0);
    handler.increment("req-1");
    expect(handler.getAttempts("req-1")).toBe(1);
    handler.increment("req-1");
    expect(handler.getAttempts("req-1")).toBe(2);
  });

  test("canRetry returns false when maxAttempts reached", () => {
    handler.increment("req-2");
    handler.increment("req-2");
    handler.increment("req-2");
    expect(handler.canRetry("req-2")).toBe(false);
  });

  test("clear removes attempt tracking for a request", () => {
    handler.increment("req-3");
    handler.clear("req-3");
    expect(handler.getAttempts("req-3")).toBe(0);
  });

  test("reset clears all tracked attempts", () => {
    handler.increment("req-4");
    handler.increment("req-5");
    handler.reset();
    expect(handler.getAttempts("req-4")).toBe(0);
    expect(handler.getAttempts("req-5")).toBe(0);
  });
});
