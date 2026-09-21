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

const postJson = (server, path, body, token) =>
  fetch(`${server.url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

const checkoutBody = (overrides = {}) => ({
  customer_name: "Juan Pérez",
  customer_phone: "8888-8888",
  address: "Barrio Central, casa 4",
  items: [{ product_id: 1, quantity: 2 }],
  ...overrides
});

const checkoutPool = () =>
  createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Johnnie Walker Black Label", price: "2750.00", stock: 12 }]]
    },
    { match: (sql) => sql.includes("INSERT INTO orders ("), respond: () => [{ insertId: 1 }] },
    { match: (sql) => sql.includes("UPDATE orders SET code"), respond: () => [{ affectedRows: 1 }] },
    { match: (sql) => sql.includes("INSERT INTO order_items ("), respond: () => [{ insertId: 1 }] },
    { match: (sql) => sql.includes("UPDATE products SET stock"), respond: () => [{ affectedRows: 1 }] }
  ]);

test("checkout rejects an empty cart", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({ items: [] }));

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "El pedido debe incluir al menos un producto");
  });
});

test("checkout rejects missing customer data", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({ customer_name: "  " }));

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "El nombre del cliente es obligatorio");
  });
});

test("checkout rejects an invalid quantity", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({
      items: [{ product_id: 1, quantity: 0 }]
    }));

    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "Las cantidades del pedido no son válidas");
  });
});

test("checkout accepts a guest order and computes the total from database prices", async () => {
  const pool = checkoutPool();

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody());
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.code, "ESH-000001");
    assert.equal(body.total, 5500);
    assert.equal(body.status, "pendiente");
    assert.equal(body.items[0].unit_price, 2750);
    assert.equal(body.items[0].subtotal, 5500);
  });
});

test("checkout merges repeated products before validating stock", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Corona Extra 6 Pack", price: "348.00", stock: 3 }]]
    },
    { match: (sql) => sql.includes("INSERT INTO orders ("), respond: () => [{ insertId: 4 }] },
    { match: (sql) => sql.includes("UPDATE orders SET code"), respond: () => [{ affectedRows: 1 }] },
    { match: (sql) => sql.includes("INSERT INTO order_items ("), respond: () => [{ insertId: 1 }] },
    { match: (sql) => sql.includes("UPDATE products SET stock"), respond: () => [{ affectedRows: 1 }] }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody({
      items: [{ product_id: 1, quantity: 2 }, { product_id: 1, quantity: 2 }]
    }));

    assert.equal(response.status, 409);
    assert.match((await response.json()).message, /Stock insuficiente/);
  });
});

test("checkout rejects an order when stock is not enough", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM products") && sql.includes("FOR UPDATE"),
      respond: () => [[{ id: 1, name: "Jack Daniel's Apple", price: "1750.00", stock: 1 }]]
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await postJson(server, "/api/orders", checkoutBody());

    assert.equal(response.status, 409);
    assert.equal((await response.json()).message, "Stock insuficiente para Jack Daniel's Apple");
  });
});

test("order history requires a bearer token", async () => {
  await withServer(createFakePool([]), async (server) => {
    const response = await fetch(`${server.url}/api/orders`);

    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "No autorizado");
  });
});

test("order history returns the orders of the session user", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM sessions s"),
      respond: () => [[{ id: 7, name: "Ana Torres", email: "ana@example.com", phone: null }]]
    },
    {
      match: (sql) => sql.includes("FROM orders WHERE user_id"),
      respond: () => [[{
        id: 1,
        code: "ESH-000001",
        status: "pendiente",
        address: "Barrio Central, casa 4",
        total: "5500.00",
        customer_name: "Juan Pérez",
        customer_phone: "8888-8888",
        notes: null,
        created_at: new Date("2026-03-14T15:30:00")
      }]]
    },
    {
      match: (sql) => sql.includes("FROM order_items"),
      respond: () => [[{
        order_id: 1,
        product_id: 1,
        product_name: "Johnnie Walker Black Label",
        unit_price: "2750.00",
        quantity: 2,
        subtotal: "5500.00"
      }]]
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/orders`, {
      headers: { Authorization: "Bearer a".repeat(64) }
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].code, "ESH-000001");
    assert.equal(body[0].total, 5500);
    assert.equal(body[0].items.length, 1);
    assert.equal(body[0].items[0].product_name, "Johnnie Walker Black Label");
    assert.equal(body[0].date, "2026-03-14 15:30");
  });
});

test("order detail responds 404 when the order does not belong to the user", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM sessions s"),
      respond: () => [[{ id: 7, name: "Ana Torres", email: "ana@example.com", phone: null }]]
    },
    { match: (sql) => sql.includes("FROM orders WHERE id = ?"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/orders/999`, {
      headers: { Authorization: "Bearer a".repeat(64) }
    });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, "Pedido no encontrado");
  });
});
