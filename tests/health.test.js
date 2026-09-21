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

test("GET /api/health responds ok", async () => {
  const response = await fetch(`${server.url}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", db: "up" });
});

test("unknown route responds 404 with a message", async () => {
  const response = await fetch(`${server.url}/api/unknown`);

  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, "Recurso no encontrado");
});

test("invalid JSON responds 400 with a message", async () => {
  const response = await fetch(`${server.url}/api/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad}"
  });

  assert.equal(response.status, 400);
  assert.equal(
    (await response.json()).message,
    "JSON inválido en el cuerpo de la solicitud"
  );
});
