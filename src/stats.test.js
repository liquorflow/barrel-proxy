const { RequestStats, createStats } = require('./stats');

describe('RequestStats', () => {
  let stats;
  beforeEach(() => { stats = createStats(); });

  test('createStats returns a RequestStats instance', () => {
    expect(stats).toBeInstanceOf(RequestStats);
  });

  test('record increments total counter', () => {
    stats.record('api', 200, 42);
    stats.record('api', 200, 10);
    expect(stats.counters['api'].total).toBe(2);
  });

  test('record tracks status codes', () => {
    stats.record('api', 200, 10);
    stats.record('api', 404, 5);
    expect(stats.counters['api'].byStatus[200]).toBe(1);
    expect(stats.counters['api'].byStatus[404]).toBe(1);
  });

  test('record increments errors for 5xx', () => {
    stats.record('api', 502, 100);
    expect(stats.errors['api']).toBe(1);
  });

  test('avgResponseTime calculates correctly', () => {
    stats.record('api', 200, 100);
    stats.record('api', 200, 200);
    expect(stats.avgResponseTime('api')).toBe(150);
  });

  test('avgResponseTime returns null for unknown service', () => {
    expect(stats.avgResponseTime('nope')).toBeNull();
  });

  test('summary returns uptime and services array', () => {
    stats.record('web', 200, 30);
    const s = stats.summary();
    expect(typeof s.uptime).toBe('number');
    expect(s.services.length).toBe(1);
    expect(s.services[0].service).toBe('web');
  });

  test('reset clears all data', () => {
    stats.record('api', 200, 10);
    stats.reset();
    expect(Object.keys(stats.counters).length).toBe(0);
  });

  test('emits recorded event', (done) => {
    stats.on('recorded', (data) => {
      expect(data.serviceId).toBe('svc');
      done();
    });
    stats.record('svc', 200, 5);
  });
});
