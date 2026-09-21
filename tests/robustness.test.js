import assert from "node:assert/strict";
import { test } from "node:test";
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

const postJson = (server, path, body) =>
  fetch(`${server.url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

const throwingPool = (error) =>
  createFakePool([{ match: () => true, respond: () => { throw error; } }]);

const databaseError = (errno) => Object.assign(new Error("query failed"), { errno });

const checkoutBody = (overrides = {}) => ({
  customer_name: "Juan Pérez",
  customer_phone: "8888-8888",
  address: "Barrio Central, casa 4",
  items: [{ product_id: 1, quantity: 1 }],
  ...overrides
});

test("database errors are translated into the matching http status", async () => {
  const cases = [
    { errno: 1406, status: 400 },
    { errno: 1264, status: 400 },
    { errno: 1452, status: 400 },
    { errno: 1062, status: 409 },
    { errno: 1213, status: 409 },
    { errno: 1045, status: 503 }
  ];

  for (const { errno, status } of cases) {
    await withServer(throwingPool(databaseError(errno)), async (server) => {
      const response = await fetch(`${server.url}/api/categories`);

      assert.equal(response.status, status, `errno ${errno} should map to ${status}`);
      assert.equal(typeof (await response.json()).message, "string");
    });
  }
});

test("a driver connection error is reported as service unavailable", async () => {
  const error = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });

  await withServer(throwingPool(error), async (server) => {
    const response = await fetch(`${server.url}/api/products`);

    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).message,
      "El servicio no está disponible en este momento"
    );
  });
});

test("an unmapped failure still returns a generic 500 without leaking details", async () => {
  await withServer(throwingPool(new Error("secret internal detail")), async (server) => {
    const response = await fetch(`${server.url}/api/categories`);

    assert.equal(response.status, 500);
    assert.equal((await response.json()).message, "Error interno del servidor");
  });
});

test("register rejects a name longer than the column allows", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "a".repeat(121),
      email: "ana@example.com",
      password: "Secret123"
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "El nombre no puede superar los 120 caracteres");
  });
});

test("register rejects an email longer than the column allows", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: `${"a".repeat(150)}@example.com`,
      password: "Secret123"
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /correo no puede superar/);
  });
});

test("register rejects a phone longer than the column allows", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "ana@example.com",
      password: "Secret123",
      phone: "9".repeat(41)
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /teléfono no puede superar/);
  });
});

test("register rejects a password longer than bcrypt can read", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/auth/register", {
      name: "Ana Torres",
      email: "ana@example.com",
      password: "a".repeat(73)
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "La contraseña no puede superar los 72 caracteres");
  });
});

test("register maps a duplicate key error to 409 even if the lookup missed it", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM users WHERE email = ?"), respond: () => [[]] },
    {
      match: (sql) => sql.includes("INSERT INTO users"),
      respond: () => {
        throw Object.assign(new Error("Duplicate entry"), { errno: 1062, code: "ER_DUP_ENTRY" });
      }
    }
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

test("checkout rejects an address longer than the column allows", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({ address: "a".repeat(301) }));

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /dirección de entrega no puede superar/);
  });
});

test("checkout rejects notes longer than the column allows", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({ notes: "n".repeat(501) }));

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /notas no puede superar/);
  });
});

test("checkout rejects more distinct products than the limit", async () => {
  const items = Array.from({ length: 51 }, (_, index) => ({ product_id: index + 1, quantity: 1 }));

  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({ items }));

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /no puede incluir más de 50 productos/);
  });
});

test("checkout rolls back the transaction and keeps the original error", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Corona Extra 6 Pack", price: "348.00", stock: 10 }]]
    },
    { match: (sql) => sql.includes("INSERT INTO orders ("), respond: () => [{ insertId: 9 }] },
    { match: (sql) => sql.includes("UPDATE orders SET code"), respond: () => [{ affectedRows: 1 }] },
    {
      match: (sql) => sql.includes("INSERT INTO order_items ("),
      respond: () => {
        throw Object.assign(new Error("insert failed"), { errno: 1406 });
      }
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody());

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "Alguno de los datos enviados es demasiado largo");
    assert.deepEqual(pool.transaction, ["begin", "rollback", "release"]);
  });
});

test("checkout commits the transaction on success", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Corona Extra 6 Pack", price: "348.00", stock: 10 }]]
    },
    { match: (sql) => sql.includes("INSERT INTO orders ("), respond: () => [{ insertId: 9 }] },
    { match: (sql) => sql.includes("UPDATE orders SET code"), respond: () => [{ affectedRows: 1 }] },
    { match: (sql) => sql.includes("INSERT INTO order_items ("), respond: () => [{ insertId: 1 }] },
    { match: (sql) => sql.includes("UPDATE products SET stock"), respond: () => [{ affectedRows: 1 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody());

    assert.equal(response.status, 201);
    assert.deepEqual(pool.transaction, ["begin", "commit", "release"]);
    assert.equal(pool.calls.filter((call) => call.sql.includes("INSERT INTO order_items (")).length, 1);
    assert.equal(pool.calls.filter((call) => call.sql.includes("UPDATE products SET stock")).length, 1);
  });
});

test("search escapes like wildcards instead of matching everything", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM products p"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/products?search=100%25`);

    assert.equal(response.status, 200);
    assert.deepEqual(pool.calls[0].params, ["%100\\%%", "%100\\%%"]);
  });
});

test("limit is clamped to the maximum page size", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM products p"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/products?limit=100000`);

    assert.equal(response.status, 200);
    assert.match(pool.calls[0].sql, /LIMIT 100\b/);
  });
});

test("checkout rejects an amount that would overflow the decimal column", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Johnnie Walker Black Label", price: "2750.00", stock: 2000000000 }]]
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({
      items: [{ product_id: 1, quantity: 100000000 }]
    }));

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /supera el máximo permitido/);
  });
});
