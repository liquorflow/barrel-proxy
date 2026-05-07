"use strict";

const DEFAULT_METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";
const DEFAULT_HEADERS = "Content-Type,Authorization,X-Request-Id";

function buildCorsHeaders(origin, options = {}) {
  const allowedOrigins = options.origins || ["*"];
  const methods = options.methods || DEFAULT_METHODS;
  const headers = options.headers || DEFAULT_HEADERS;
  const credentials = options.credentials || false;
  const maxAge = options.maxAge || 86400;

  const allowed =
    allowedOrigins.includes("*")
      ? "*"
      : allowedOrigins.includes(origin)
      ? origin
      : null;

  if (!allowed) return null;

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": headers,
    "Access-Control-Max-Age": String(maxAge),
  };

  if (credentials && allowed !== "*") {
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return corsHeaders;
}

function createCorsMiddleware(options = {}) {
  return function corsMiddleware(req, res, next) {
    const origin = req.headers["origin"] || "";
    const corsHeaders = buildCorsHeaders(origin, options);

    if (!corsHeaders) {
      return next();
    }

    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

function createCorsStatusRoute(options = {}) {
  return function corsStatusRoute(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        origins: options.origins || ["*"],
        methods: options.methods || DEFAULT_METHODS,
        headers: options.headers || DEFAULT_HEADERS,
        credentials: options.credentials || false,
        maxAge: options.maxAge || 86400,
      })
    );
  };
}

module.exports = { buildCorsHeaders, createCorsMiddleware, createCorsStatusRoute };
