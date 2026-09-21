import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createFakePool } from "./helpers/fakePool.js";
import { startTestServer } from "./helpers/server.js";

let server;

before(async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("SELECT 1"), respond: () => [[{ ok: 1 }]] }
  ]);

  server = await startTestServer({ pool });
});

after(async () => {
  await server.close();
});

test("GET /api/health responds ok", async () => {
  const response = await fetch(`${server.url}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", db: "up" });
});

test("GET /api/health reports the database as down when the connection fails", async () => {
  const downServer = await startTestServer({ pool: createFakePool([]) });

  try {
    const response = await fetch(`${downServer.url}/api/health`);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "degraded", db: "down" });
  } finally {
    await downServer.close();
  }
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
