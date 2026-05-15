'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { AccessLog, createAccessLog } = require('./access-log.js');

const makeEntry = (overrides = {}) => ({
  method: 'GET',
  path: '/api/users',
  status: 200,
  duration: 42,
  bytes: 512,
  ip: '127.0.0.1',
  userAgent: 'TestAgent/1.0',
  service: 'api',
  requestId: 'abc-123',
  ...overrides,
});

describe('AccessLog', () => {
  let log;

  beforeEach(() => {
    log = createAccessLog({ maxEntries: 10 });
  });

  it('records an entry and emits event', () => {
    let emitted = null;
    log.on('entry', e => { emitted = e; });
    const entry = log.record(makeEntry());
    assert.equal(entry.method, 'GET');
    assert.equal(entry.status, 200);
    assert.ok(entry.timestamp);
    assert.deepEqual(emitted, entry);
  });

  it('shouldLog returns false when disabled', () => {
    const disabled = createAccessLog({ enabled: false });
    assert.equal(disabled.shouldLog('/any'), false);
  });

  it('shouldLog respects excludePaths', () => {
    const l = createAccessLog({ excludePaths: ['/health', '/_barrel'] });
    assert.equal(l.shouldLog('/health'), false);
    assert.equal(l.shouldLog('/health/check'), false);
    assert.equal(l.shouldLog('/api'), true);
  });

  it('enforces maxEntries limit', () => {
    for (let i = 0; i < 15; i++) log.record(makeEntry({ path: `/p/${i}` }));
    assert.equal(log.entries.length, 10);
  });

  it('getEntries filters by service', () => {
    log.record(makeEntry({ service: 'api' }));
    log.record(makeEntry({ service: 'auth' }));
    log.record(makeEntry({ service: 'api' }));
    const results = log.getEntries({ service: 'api' });
    assert.equal(results.length, 2);
    assert.ok(results.every(e => e.service === 'api'));
  });

  it('getEntries filters by status', () => {
    log.record(makeEntry({ status: 200 }));
    log.record(makeEntry({ status: 404 }));
    const results = log.getEntries({ status: 404 });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 404);
  });

  it('formatEntry combined format', () => {
    const entry = log.record(makeEntry());
    const out = log.formatEntry(entry);
    assert.ok(out.includes('GET'));
    assert.ok(out.includes('200'));
    assert.ok(out.includes('127.0.0.1'));
  });

  it('formatEntry short format', () => {
    const l = createAccessLog({ format: 'short' });
    const entry = l.record(makeEntry());
    const out = l.formatEntry(entry);
    assert.ok(out.includes('GET /api/users 200'));
  });

  it('clear removes all entries and emits event', () => {
    log.record(makeEntry());
    let cleared = false;
    log.on('cleared', () => { cleared = true; });
    log.clear();
    assert.equal(log.entries.length, 0);
    assert.equal(cleared, true);
  });
});
