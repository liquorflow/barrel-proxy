const { createLogger, setLevel, setOutput } = require('./logger');

function makeMockOutput() {
  const lines = { log: [], warn: [], error: [] };
  return {
    log:   (msg) => lines.log.push(msg),
    warn:  (msg) => lines.warn.push(msg),
    error: (msg) => lines.error.push(msg),
    lines,
  };
}

beforeEach(() => {
  setLevel('debug');
});

test('createLogger writes info to output.log', () => {
  const out = makeMockOutput();
  setOutput(out);
  const logger = createLogger('test');
  logger.info('hello world');
  expect(out.lines.log).toHaveLength(1);
  expect(out.lines.log[0]).toMatch(/INFO.*\[test\].*hello world/);
});

test('createLogger writes error to output.error', () => {
  const out = makeMockOutput();
  setOutput(out);
  const logger = createLogger('proxy');
  logger.error('something broke');
  expect(out.lines.error[0]).toMatch(/ERROR.*\[proxy\].*something broke/);
});

test('messages below current level are suppressed', () => {
  const out = makeMockOutput();
  setOutput(out);
  setLevel('warn');
  const logger = createLogger('test');
  logger.debug('ignored');
  logger.info('also ignored');
  logger.warn('visible');
  expect(out.lines.log).toHaveLength(0);
  expect(out.lines.warn).toHaveLength(1);
});

test('logger without context omits brackets', () => {
  const out = makeMockOutput();
  setOutput(out);
  const logger = createLogger(null);
  logger.info('no context');
  expect(out.lines.log[0]).not.toMatch(/\[/);
});
