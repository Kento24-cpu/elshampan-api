import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { createFakePool } from "./helpers/fakePool.js";
import { startTestServer } from "./helpers/server.js";

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

const userRow = (overrides = {}) => ({
  id: 7,
  name: "Ana Torres",
  email: "ana@example.com",
  phone: null,
  ...overrides
});

const registrationPool = () =>
  createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[]] },
    { match: (sql) => sql.includes("INSERT INTO users"), respond: () => [{ insertId: 7 }] },
    { match: (sql) => sql.includes("FROM users WHERE id = ?"), respond: () => [[userRow()]] },
    { match: (sql) => sql.includes("INSERT INTO sessions"), respond: () => [{ insertId: 1 }] }
  ]);

test("register rejects a missing name", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      email: "ana@example.com",
      password: "Secret123"
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "El nombre es obligatorio");
  });
});

test("register rejects an invalid email", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "ana(arroba)example.com",
      password: "Secret123"
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "El correo no es válido");
  });
});

test("register rejects a short password", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "ana@example.com",
      password: "123"
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /al menos 6 caracteres/);
  });
});

test("register rejects an email that is already taken", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[userRow()]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "ana@example.com",
      password: "Secret123"
    });

    assert.equal(response.status, 409);
    assert.equal((await response.json()).message, "El correo ya está registrado");
  });
});

test("register creates the account and returns a token", async () => {
  await withServer(registrationPool(), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "Ana@Example.com",
      password: "Secret123"
    });

    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.user.email, "ana@example.com");
    assert.equal(body.user.name, "Ana Torres");
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(typeof body.token, "string");
    assert.equal(body.token.length, 64);
  });
});

test("login rejects an unknown email", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/login", {
      email: "nadie@example.com",
      password: "Secret123"
    });

    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "Credenciales inválidas");
  });
});

test("login rejects a wrong password", async () => {
  const passwordHash = await bcrypt.hash("Secret123", 10);
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM users WHERE email = ?"),
      respond: () => [[userRow({ password_hash: passwordHash })]]
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/login", {
      email: "ana@example.com",
      password: "otra-clave"
    });

    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "Credenciales inválidas");
  });
});

test("login returns a token for valid credentials", async () => {
  const passwordHash = await bcrypt.hash("Secret123", 10);
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM users WHERE email = ?"),
      respond: () => [[userRow({ password_hash: passwordHash })]]
    },
    { match: (sql) => sql.includes("INSERT INTO sessions"), respond: () => [{ insertId: 1 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/auth/login", {
      email: "ana@example.com",
      password: "Secret123"
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.id, 7);
    assert.equal(body.token.length, 64);
  });
});

test("me requires a bearer token", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await fetch(`${server.url}/api/auth/me`);

    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "No autorizado");
  });
});

test("me returns the user behind the session token", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM sessions s"), respond: () => [[userRow()]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/auth/me`, {
      headers: { Authorization: "Bearer a".repeat(64) }
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.email, "ana@example.com");
  });
});

test("updateMe returns the updated user", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM sessions s"), respond: () => [[userRow()]] },
    { match: (sql) => sql.includes("FROM users WHERE id = ?"), respond: () => [[userRow({ name: "Ana Actualizada", phone: "8888-8888" })]] },
    { match: (sql) => sql.includes("UPDATE users SET"), respond: () => [{ affectedRows: 1 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer a".repeat(64)
      },
      body: JSON.stringify({ name: "Ana Actualizada", phone: "8888-8888" })
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.name, "Ana Actualizada");
    assert.equal(body.phone, "8888-8888");
  });
});
