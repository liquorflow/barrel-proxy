const { onProxyError, onNoMatch, onServerError, attachServerErrorHandlers } = require('./error-handler');
const logger = require('./logger');
const { EventEmitter } = require('events');

function makeMockRes(headersSent = false) {
  return {
    headersSent,
    statusCode: 200,
    headers: {},
    body: null,
    destroyed: false,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(code, hdrs) { this.statusCode = code; Object.assign(this.headers, hdrs || {}); },
    end(b) { this.body = b; },
    destroy() { this.destroyed = true; },
  };
}

function makeMockReq(overrides = {}) {
  return { method: 'GET', url: '/api/data', ...overrides };
}

let logs = [];
beforeEach(() => {
  logs = [];
  logger.setOutput((level, msg) => logs.push({ level, msg }));
});

describe('onProxyError', () => {
  test('sends 502 when headers not sent', () => {
    const req = makeMockReq();
    const res = makeMockRes(false);
    onProxyError(new Error('ECONNREFUSED'), req, res, 'api');
    expect(res.statusCode).toBe(502);
    expect(logs.some(l => l.level === 'error')).toBe(true);
  });

  test('destroys response when headers already sent', () => {
    const req = makeMockReq();
    const res = makeMockRes(true);
    onProxyError(new Error('socket hang up'), req, res, 'api');
    expect(res.destroyed).toBe(true);
  });
});

describe('onNoMatch', () => {
  test('sends 404 and logs warn', () => {
    const req = makeMockReq({ url: '/unknown' });
    const res = makeMockRes();
    onNoMatch(req, res);
    expect(res.statusCode).toBe(404);
    expect(logs.some(l => l.level === 'warn')).toBe(true);
  });
});

describe('attachServerErrorHandlers', () => {
  test('attaches error listener to server', () => {
    const server = new EventEmitter();
    attachServerErrorHandlers(server);
    expect(server.listenerCount('error')).toBe(1);
  });

  test('logs EADDRINUSE specially', () => {
    const server = new EventEmitter();
    attachServerErrorHandlers(server);
    const err = Object.assign(new Error('address in use'), { code: 'EADDRINUSE', port: 3000 });
    server.emit('error', err);
    expect(logs.some(l => l.msg.includes('3000'))).toBe(true);
  });
});
