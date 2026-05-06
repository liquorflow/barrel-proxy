const http = require('http');
const { createRetryHandler } = require('./retry');

function buildEchoServer(failTimes = 0) {
  let count = 0;
  const server = http.createServer((req, res) => {
    count++;
    if (count <= failTimes) {
      res.socket.destroy();
      return;
    }
    res.writeHead(200);
    res.end('ok');
  });
  return server;
}

function httpGet(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

async function fetchWithRetry(port, handler) {
  return handler.execute(async () => httpGet(port));
}

let server;
let port;

beforeAll((done) => {
  server = buildEchoServer(2);
  server.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => server.close(done));

test('retry handler succeeds after transient connection failures', async () => {
  const handler = createRetryHandler({ maxAttempts: 5, delay: 20 });
  const retries = [];
  handler.on('retry', ({ attempt }) => retries.push(attempt));
  const result = await fetchWithRetry(port, handler);
  expect(result.status).toBe(200);
  expect(result.body).toBe('ok');
  expect(retries.length).toBeGreaterThanOrEqual(1);
});

test('retry handler emits exhausted when all attempts fail', async () => {
  const badPort = 19999;
  const handler = createRetryHandler({ maxAttempts: 2, delay: 10 });
  let exhausted = false;
  handler.on('exhausted', () => { exhausted = true; });
  await expect(fetchWithRetry(badPort, handler)).rejects.toBeDefined();
  expect(exhausted).toBe(true);
});
