const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createUpstreamHealthMonitor } = require('./upstream-health.js');

function makeServer(statusCode) {
  const server = http.createServer((req, res) => res.writeHead(statusCode).end());
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

describe('UpstreamHealthMonitor', () => {
  let monitor;
  let server;

  beforeEach(() => {
    monitor = createUpstreamHealthMonitor({ interval: 200, timeout: 500, threshold: 2 });
  });

  afterEach(async () => {
    monitor.stop();
    if (server) await new Promise((r) => server.close(r));
    server = null;
  });

  it('reports healthy when upstream returns 2xx', async () => {
    server = await makeServer(200);
    const port = server.address().port;
    const result = await new Promise((resolve) => {
      monitor.once('healthy', resolve);
      monitor.watch('svc', `http://127.0.0.1:${port}/`);
    });
    assert.equal(result, 'svc');
    assert.equal(monitor.getStatus('svc'), 'healthy');
  });

  it('reports unhealthy after threshold failures', async () => {
    server = await makeServer(503);
    const port = server.address().port;
    const result = await new Promise((resolve) => {
      monitor.once('unhealthy', resolve);
      monitor.watch('svc', `http://127.0.0.1:${port}/`);
    });
    assert.equal(result, 'svc');
    assert.equal(monitor.getStatus('svc'), 'unhealthy');
  });

  it('emits change event with status', async () => {
    server = await makeServer(200);
    const port = server.address().port;
    const [name, status] = await new Promise((resolve) => {
      monitor.once('change', (n, s) => resolve([n, s]));
      monitor.watch('svc', `http://127.0.0.1:${port}/`);
    });
    assert.equal(name, 'svc');
    assert.equal(status, 'healthy');
  });

  it('getAllStatus returns map of all services', async () => {
    server = await makeServer(200);
    const port = server.address().port;
    await new Promise((resolve) => {
      monitor.once('healthy', resolve);
      monitor.watch('api', `http://127.0.0.1:${port}/`);
    });
    const all = monitor.getAllStatus();
    assert.equal(all['api'], 'healthy');
  });

  it('unwatch removes service tracking', async () => {
    server = await makeServer(200);
    const port = server.address().port;
    monitor.watch('tmp', `http://127.0.0.1:${port}/`);
    monitor.unwatch('tmp');
    assert.equal(monitor.getStatus('tmp'), 'unknown');
  });
});
