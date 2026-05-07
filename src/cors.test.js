"use strict";

const { buildCorsHeaders, createCorsMiddleware, createCorsStatusRoute } = require("./cors");

function makeMockRes() {
  const headers = {};
  return {
    headers,
    statusCode: null,
    body: null,
    setHeader(k, v) { headers[k] = v; },
    writeHead(code) { this.statusCode = code; },
    end(body) { this.body = body || null; },
  };
}

function makeMockReq(method = "GET", origin = "http://localhost:3000") {
  return { method, headers: { origin } };
}

test("buildCorsHeaders returns wildcard for open config", () => {
  const h = buildCorsHeaders("http://example.com", { origins: ["*"] });
  expect(h["Access-Control-Allow-Origin"]).toBe("*");
});

test("buildCorsHeaders returns matching origin", () => {
  const h = buildCorsHeaders("http://example.com", { origins: ["http://example.com"] });
  expect(h["Access-Control-Allow-Origin"]).toBe("http://example.com");
});

test("buildCorsHeaders returns null for disallowed origin", () => {
  const h = buildCorsHeaders("http://evil.com", { origins: ["http://example.com"] });
  expect(h).toBeNull();
});

test("buildCorsHeaders sets credentials header when enabled and origin not wildcard", () => {
  const h = buildCorsHeaders("http://example.com", {
    origins: ["http://example.com"],
    credentials: true,
  });
  expect(h["Access-Control-Allow-Credentials"]).toBe("true");
});

test("createCorsMiddleware sets headers and calls next", () => {
  const mw = createCorsMiddleware({ origins: ["*"] });
  const req = makeMockReq("GET", "http://localhost:3000");
  const res = makeMockRes();
  let called = false;
  mw(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
});

test("createCorsMiddleware handles preflight OPTIONS", () => {
  const mw = createCorsMiddleware({ origins: ["*"] });
  const req = makeMockReq("OPTIONS", "http://localhost:3000");
  const res = makeMockRes();
  let called = false;
  mw(req, res, () => { called = true; });
  expect(called).toBe(false);
  expect(res.statusCode).toBe(204);
});

test("createCorsMiddleware skips disallowed origin", () => {
  const mw = createCorsMiddleware({ origins: ["http://allowed.com"] });
  const req = makeMockReq("GET", "http://evil.com");
  const res = makeMockRes();
  let called = false;
  mw(req, res, () => { called = true; });
  expect(called).toBe(true);
  expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
});

test("createCorsStatusRoute returns config as json", () => {
  const route = createCorsStatusRoute({ origins: ["http://example.com"], credentials: true });
  const req = makeMockReq();
  const res = makeMockRes();
  route(req, res);
  const body = JSON.parse(res.body);
  expect(body.origins).toEqual(["http://example.com"]);
  expect(body.credentials).toBe(true);
});
