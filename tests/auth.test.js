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

const request = async (method, path, { body, token } = {}) => {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  return { status: response.status, body: await response.json() };
};

const registerUser = (overrides = {}) =>
  request("POST", "/api/auth/register", {
    body: {
      name: "Carlos Rivera",
      email: "carlos@example.com",
      password: "secreto123",
      phone: "8888-1234",
      ...overrides
    }
  });

test("POST /api/auth/register creates the user and returns a token", async () => {
  const { status, body } = await registerUser();

  assert.equal(status, 201);
  assert.equal(body.user.email, "carlos@example.com");
  assert.equal(body.user.name, "Carlos Rivera");
  assert.equal(body.user.phone, "8888-1234");
  assert.equal(typeof body.user.id, "string");
  assert.equal(body.user.password_hash, undefined);
  assert.equal(typeof body.token, "string");
});

test("POST /api/auth/register rejects duplicated emails", async () => {
  await registerUser({ email: "repetido@example.com" });
  const { status, body } = await registerUser({ email: "repetido@example.com" });

  assert.equal(status, 409);
  assert.equal(body.message, "Ese correo ya está registrado");
});

test("POST /api/auth/register validates its input", async () => {
  const invalidEmail = await registerUser({ email: "no-es-correo" });
  assert.equal(invalidEmail.status, 400);
  assert.equal(invalidEmail.body.message, "El correo no es válido");

  const shortPassword = await registerUser({ password: "123" });
  assert.equal(shortPassword.status, 400);
  assert.equal(
    shortPassword.body.message,
    "El campo contraseña es obligatorio"
  );

  const missingName = await registerUser({ name: "" });
  assert.equal(missingName.status, 400);
  assert.equal(missingName.body.message, "El campo nombre es obligatorio");
});

test("POST /api/auth/login accepts the seeded demo user", async () => {
  const { status, body } = await request("POST", "/api/auth/login", {
    body: { email: "demo@elshampan.com", password: "Demo1234" }
  });

  assert.equal(status, 200);
  assert.equal(body.user.email, "demo@elshampan.com");
  assert.equal(typeof body.token, "string");
});

test("POST /api/auth/login rejects wrong credentials without revealing emails", async () => {
  const wrongPassword = await request("POST", "/api/auth/login", {
    body: { email: "demo@elshampan.com", password: "incorrecta" }
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.message, "Credenciales inválidas");

  const unknownEmail = await request("POST", "/api/auth/login", {
    body: { email: "nadie@example.com", password: "secreto123" }
  });
  assert.equal(unknownEmail.status, 401);
  assert.equal(unknownEmail.body.message, "Credenciales inválidas");
});

test("GET /api/auth/me requires a valid token", async () => {
  const missing = await request("GET", "/api/auth/me");
  assert.equal(missing.status, 401);
  assert.equal(missing.body.message, "Inicia sesión para continuar");

  const invalid = await request("GET", "/api/auth/me", {
    token: "token.invalido.aqui"
  });
  assert.equal(invalid.status, 401);
  assert.equal(
    invalid.body.message,
    "Tu sesión venció, vuelve a iniciar sesión"
  );
});

test("GET /api/auth/me returns the authenticated user", async () => {
  const { body: registered } = await registerUser({
    email: "perfil@example.com"
  });

  const { status, body } = await request("GET", "/api/auth/me", {
    token: registered.token
  });

  assert.equal(status, 200);
  assert.equal(body.email, "perfil@example.com");
  assert.equal(body.id, registered.user.id);
});

test("PATCH /api/auth/me updates the profile", async () => {
  const { body: registered } = await registerUser({
    email: "edita@example.com"
  });

  const updated = await request("PATCH", "/api/auth/me", {
    token: registered.token,
    body: { name: "Nombre Editado", phone: "7777-0000" }
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "Nombre Editado");
  assert.equal(updated.body.phone, "7777-0000");
  assert.equal(updated.body.email, "edita@example.com");

  const empty = await request("PATCH", "/api/auth/me", {
    token: registered.token,
    body: {}
  });

  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, "No hay datos para actualizar");
});
