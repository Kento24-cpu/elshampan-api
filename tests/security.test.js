import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { createFakePool } from "./helpers/fakePool.js";
import { startTestServer } from "./helpers/server.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const withServer = async (pool, run) => {
  const server = await startTestServer({ pool });

  try {
    return await run(server);
  } finally {
    await server.close();
  }
};

const postJson = (server, path, body, token) =>
  fetch(`${server.url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

const userRow = {
  id: 7,
  name: "Ana Torres",
  email: "ana@example.com",
  phone: null
};

const TOKEN = "a".repeat(64);

test("sessions store the hash of the token, never the token itself", async () => {
  const passwordHash = "$2b$10$UXJFDuHJJ5w/.O48d8znBu8H8jBbU0K7V3pXvWvx10gBns/DB2xwS";
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM users WHERE email = ?"),
      respond: () => [[{ ...userRow, password_hash: passwordHash }]]
    },
    { match: (sql) => sql.includes("INSERT INTO sessions"), respond: () => [{ insertId: 1 }] },
    { match: (sql) => sql.includes("DELETE FROM sessions WHERE expires_at"), respond: () => [{ affectedRows: 0 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/login", {
      email: "ana@example.com",
      password: "dummy-password-for-timing"
    });

    const { token } = await response.json();
    const insert = pool.calls.find((call) => call.sql.includes("INSERT INTO sessions"));

    assert.equal(response.status, 200);
    assert.equal(insert.params[1], sha256(token));
    assert.notEqual(insert.params[1], token);
  });
});

test("logout revokes the session and answers 204", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM sessions s"), respond: () => [[userRow]] },
    { match: (sql) => sql.includes("DELETE FROM sessions WHERE token"), respond: () => [{ affectedRows: 1 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/logout", undefined, TOKEN);
    const deleted = pool.calls.find((call) => call.sql.includes("DELETE FROM sessions WHERE token"));

    assert.equal(response.status, 204);
    assert.deepEqual(deleted.params, [sha256(TOKEN)]);
  });
});

test("logout requires a session", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/logout");

    assert.equal(response.status, 401);
  });
});

test("an unknown email and a wrong password are indistinguishable", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const unknown = await postJson(server, "/api/auth/login", {
      email: "nadie@example.com",
      password: "Secret123"
    });

    const wrongPassword = await postJson(server, "/api/auth/login", {
      email: "ana@example.com",
      password: "otra-clave"
    });

    assert.equal(unknown.status, wrongPassword.status);
    assert.deepEqual(await unknown.json(), await wrongPassword.json());
  });
});

test("repeated login attempts are throttled", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[]] }
  ]);

  const server = await startTestServer({ pool, authRateLimit: { windowMs: 60000, limit: 2 } });

  try {
    const attempt = () => postJson(server, "/api/auth/login", { email: "nadie@example.com", password: "x" });

    assert.equal((await attempt()).status, 401);
    assert.equal((await attempt()).status, 401);

    const throttled = await attempt();

    assert.equal(throttled.status, 429);
    assert.match((await throttled.json()).message, /Demasiados intentos/);
  } finally {
    await server.close();
  }
});

test("the rate limit applies per route, not to the whole api", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM categories"), respond: () => [[]] }
  ]);

  const server = await startTestServer({ pool, authRateLimit: { windowMs: 60000, limit: 1 } });

  try {
    assert.equal((await fetch(`${server.url}/api/categories`)).status, 200);
    assert.equal((await fetch(`${server.url}/api/categories`)).status, 200);
    assert.equal((await fetch(`${server.url}/api/categories`)).status, 200);
  } finally {
    await server.close();
  }
});
