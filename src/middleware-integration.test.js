/**
 * Integration tests: middleware + error-handler working together
 * in a simulated request lifecycle
 */

const { requestId, requestLogger, compose } = require('./middleware');
const { onProxyError, onNoMatch } = require('./error-handler');
const logger = require('./logger');

function makePipeline(...fns) {
  return compose(...fns);
}

function makeMockRes() {
  const listeners = {};
  return {
    statusCode: 200,
    headers: {},
    body: null,
    headersSent: false,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(code, hdrs) {
      this.statusCode = code;
      this.headersSent = true;
      Object.assign(this.headers, hdrs || {});
    },
    end(b) { this.body = b; },
    on(e, fn) { listeners[e] = fn; },
    emit(e) { if (listeners[e]) listeners[e](); },
    destroy() { this.destroyed = true; },
  };
}

let logs = [];
beforeEach(() => {
  logs = [];
  logger.setOutput((level, msg) => logs.push({ level, msg }));
});

test('request gets an ID and logs on finish', () => {
  const req = { method: 'GET', url: '/health' };
  const res = makeMockRes();

  const run = makePipeline(requestId, requestLogger);
  run(req, res);

  expect(req.requestId).toBeDefined();
  expect(res.headers['X-Request-Id']).toBe(req.requestId);

  // simulate response finish
  res.emit('finish');
  expect(logs.some(l => l.msg.includes('/health'))).toBe(true);
});

test('unmatched route returns 404 after middleware', () => {
  const req = { method: 'POST', url: '/no-such-route' };
  const res = makeMockRes();

  const run = makePipeline(
    requestId,
    requestLogger,
    (req, res) => onNoMatch(req, res)
  );
  run(req, res);

  expect(res.statusCode).toBe(404);
  const body = JSON.parse(res.body);
  expect(body.path).toBe('/no-such-route');
});

test('proxy error after middleware returns 502', () => {
  const req = { method: 'GET', url: '/api/users' };
  const res = makeMockRes();

  const run = makePipeline(
    requestId,
    requestLogger,
    (req, res) => onProxyError(new Error('ECONNREFUSED'), req, res, 'users-service')
  );
  run(req, res);

  expect(res.statusCode).toBe(502);
  const body = JSON.parse(res.body);
  expect(body.message).toContain('users-service');
});
