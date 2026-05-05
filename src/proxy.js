const http = require('http');
const httpProxy = require('http-proxy');

function createProxy() {
  return httpProxy.createProxyServer({ changeOrigin: true });
}

function matchService(services, req) {
  const host = req.headers.host || '';
  const hostname = host.split(':')[0];

  for (const service of services) {
    if (service.host && hostname === service.host) {
      return service;
    }
  }

  for (const service of services) {
    if (service.path && req.url.startsWith(service.path)) {
      return service;
    }
  }

  return null;
}

function createServer(config) {
  const proxy = createProxy();
  const { services, port = 3000 } = config;

  proxy.on('error', (err, req, res) => {
    console.error(`[barrel] proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway');
  });

  const server = http.createServer((req, res) => {
    const service = matchService(services, req);

    if (!service) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No matching service found');
      return;
    }

    const target = `http://${service.target}`;
    console.log(`[barrel] ${req.method} ${req.url} -> ${target}`);
    proxy.web(req, res, { target });
  });

  return {
    start() {
      server.listen(port, () => {
        console.log(`[barrel] proxy listening on http://localhost:${port}`);
      });
      return server;
    },
    stop() {
      server.close();
      proxy.close();
    },
    server,
    proxy,
  };
}

module.exports = { createServer, matchService, createProxy };
