import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer, stopTestServer } from "./helpers/server.js";

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await stopTestServer(server);
});

const preflight = (path, { method = "GET", headers = [], privateNetwork = false } = {}) =>
  fetch(`${server.url}${path}`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:8081",
      "Access-Control-Request-Method": method,
      ...(headers.length > 0
        ? { "Access-Control-Request-Headers": headers.join(",") }
        : {}),
      ...(privateNetwork
        ? { "Access-Control-Request-Private-Network": "true" }
        : {})
    }
  });

test("preflight allows the app origin and requested headers", async () => {
  const response = await preflight("/api/orders", {
    method: "POST",
    headers: ["content-type", "authorization"]
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
  assert.match(response.headers.get("access-control-allow-methods"), /PATCH/);
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "content-type,authorization"
  );
});

test("preflight answers private network requests from the browser", async () => {
  const response = await preflight("/api/products", {
    method: "GET",
    privateNetwork: true
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-private-network"),
    "true"
  );
});

test("private network header is only sent when the browser asks for it", async () => {
  const response = await preflight("/api/products", { method: "GET" });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-private-network"),
    null
  );
});

test("responses keep the CORS header on errors", async () => {
  const unauthorized = await fetch(`${server.url}/api/orders`, {
    headers: { Origin: "http://localhost:8081" }
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("access-control-allow-origin"), "*");

  const notFound = await fetch(`${server.url}/api/products/999`, {
    headers: { Origin: "http://localhost:8081" }
  });
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers.get("access-control-allow-origin"), "*");

  const badRequest = await fetch(`${server.url}/api/orders`, {
    method: "POST",
    headers: { Origin: "http://localhost:8081", "Content-Type": "application/json" },
    body: JSON.stringify({ items: [] })
  });
  assert.equal(badRequest.status, 400);
  assert.equal(badRequest.headers.get("access-control-allow-origin"), "*");
});
