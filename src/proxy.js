const http = require('http');
const httpProxy = require('http-proxy');
const { createLogger } = require('./logger');

const log = createLogger('proxy');

function matchService(services, hostname) {
  const host = (hostname || '').split(':')[0];
  return services.find((svc) => {
    if (svc.hostname) return svc.hostname === host;
    return false;
  }) || services.find((svc) => svc.default) || null;
}

function createProxy(services) {
  const proxy = httpProxy.createProxyServer({ changeOrigin: true });

  proxy.on('error', (err, req, res) => {
    log.error(`Proxy error for ${req.url}: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway');
  });

  return proxy;
}

function createServer(config) {
  const { services } = config;
  const proxy = createProxy(services);

  const server = http.createServer((req, res) => {
    const svc = matchService(services, req.headers.host);
    if (!svc) {
      log.warn(`No service matched for host: ${req.headers.host}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No matching service');
      return;
    }
    log.debug(`Routing ${req.headers.host}${req.url} -> ${svc.target}`);
    proxy.web(req, res, { target: svc.target });
  });

  server.on('upgrade', (req, socket, head) => {
    const svc = matchService(services, req.headers.host);
    if (svc) proxy.ws(req, socket, head, { target: svc.target });
  });

  return server;
}

module.exports = { createProxy, matchService, createServer };
