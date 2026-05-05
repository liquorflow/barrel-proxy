const http = require('http');
const { createLiveReloadServer, DEFAULT_PORT } = require('./livereload');

let server;

afterEach(async () => {
  if (server) {
    await server.stop();
    server = null;
  }
});

test('DEFAULT_PORT is 35729', () => {
  expect(DEFAULT_PORT).toBe(35729);
});

test('createLiveReloadServer returns a LiveReloadServer instance', () => {
  server = createLiveReloadServer(35730);
  expect(server).toBeDefined();
  expect(typeof server.start).toBe('function');
  expect(typeof server.reload).toBe('function');
  expect(typeof server.stop).toBe('function');
});

test('server starts and listens on given port', async () => {
  server = createLiveReloadServer(35731);
  const port = await server.start();
  expect(port).toBe(35731);
});

test('emits started event with port', async () => {
  server = createLiveReloadServer(35732);
  const ports = [];
  server.on('started', (p) => ports.push(p));
  await server.start();
  expect(ports).toEqual([35732]);
});

test('serves livereload.js script', async () => {
  server = createLiveReloadServer(35733);
  await server.start();
  const body = await new Promise((resolve, reject) => {
    http.get('http://localhost:35733/livereload.js', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  expect(body).toContain('EventSource');
  expect(body).toContain('location.reload');
});

test('reload emits reload event with client count', async () => {
  server = createLiveReloadServer(35734);
  await server.start();
  const counts = [];
  server.on('reload', (n) => counts.push(n));
  server.reload();
  expect(counts).toEqual([0]);
});

test('returns 404 for unknown routes', async () => {
  server = createLiveReloadServer(35735);
  await server.start();
  const status = await new Promise((resolve, reject) => {
    http.get('http://localhost:35735/unknown', (res) => resolve(res.statusCode)).on('error', reject);
  });
  expect(status).toBe(404);
});
