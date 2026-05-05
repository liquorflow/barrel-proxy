/**
 * Centralized error handler for proxy and server errors
 */

const logger = require('./logger');
const { badGateway, notFound } = require('./middleware');

/**
 * Handles proxy errors (e.g. ECONNREFUSED when upstream is down)
 */
function onProxyError(err, req, res, serviceName) {
  logger.log('error', `Proxy error for service "${serviceName}" on ${req.url}: ${err.message}`);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  badGateway(req, res, serviceName);
}

/**
 * Handles requests that don't match any configured service
 */
function onNoMatch(req, res) {
  logger.log('warn', `No service matched: ${req.method} ${req.url}`);
  notFound(req, res);
}

/**
 * Handles uncaught server-level errors
 */
function onServerError(err) {
  if (err.code === 'EADDRINUSE') {
    logger.log('error', `Port ${err.port} is already in use. Is barrel-proxy already running?`);
  } else {
    logger.log('error', `Server error: ${err.message}`);
  }
}

/**
 * Attaches error handlers to an http.Server instance
 */
function attachServerErrorHandlers(server) {
  server.on('error', onServerError);
  return server;
}

module.exports = { onProxyError, onNoMatch, onServerError, attachServerErrorHandlers };
