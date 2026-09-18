import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool } from "../src/db/pool.js";
import { startTestServer, stopTestServer } from "./helpers/server.js";

let server;
let token;
let guestOrderId;

const request = async (path, { method = "GET", body, authToken } = {}) => {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  return { status: response.status, body: await response.json() };
};

const customer = {
  customer_name: "Ana López",
  customer_phone: "8888-1111",
  address: "Barrio Central, casa 4",
  notes: "Sin hielo"
};

before(async () => {
  server = await startTestServer();

  const { body } = await request("/api/auth/login", {
    method: "POST",
    body: { email: "demo@elshampan.com", password: "Demo1234" }
  });

  token = body.token;
});

after(async () => {
  await stopTestServer(server);
});

test("POST /api/orders creates a guest order and discounts stock", async () => {
  const { status, body } = await request("/api/orders", {
    method: "POST",
    body: {
      ...customer,
      items: [{ product_id: 13, quantity: 2, price: 1 }]
    }
  });

  guestOrderId = body.id;

  assert.equal(status, 201);
  assert.match(body.code, /^EC-\d{6}$/);
  assert.equal(body.status, "recibido");
  assert.equal(body.total, 696);
  assert.equal(body.customer_name, "Ana López");
  assert.equal(body.notes, "Sin hielo");
  assert.ok(body.date);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].product_id, "13");
  assert.equal(body.items[0].unit_price, 348);
  assert.equal(body.items[0].subtotal, 696);

  const [[product]] = await pool.query(
    "SELECT stock FROM products WHERE id = 13"
  );
  assert.equal(product.stock, 28);

  const [[order]] = await pool.query(
    "SELECT user_id FROM orders WHERE id = ?",
    [body.id]
  );
  assert.equal(order.user_id, null);
});

test("POST /api/orders links orders of authenticated users", async () => {
  const { status, body } = await request("/api/orders", {
    method: "POST",
    body: { ...customer, items: [{ product_id: 14, quantity: 1 }] },
    authToken: token
  });

  assert.equal(status, 201);

  const [[order]] = await pool.query(
    "SELECT user_id FROM orders WHERE id = ?",
    [body.id]
  );
  assert.equal(order.user_id, 1);

  const [[product]] = await pool.query(
    "SELECT stock FROM products WHERE id = 14"
  );
  assert.equal(product.stock, 31);
});

test("POST /api/orders rejects orders with insufficient stock", async () => {
  const { status, body } = await request("/api/orders", {
    method: "POST",
    body: { ...customer, items: [{ product_id: 17, quantity: 8 }] }
  });

  assert.equal(status, 409);
  assert.equal(
    body.message,
    "Stock insuficiente para Jack Daniel's Apple (disponible: 7)"
  );

  const [[product]] = await pool.query(
    "SELECT stock FROM products WHERE id = 17"
  );
  assert.equal(product.stock, 7);
});

test("POST /api/orders validates the payload", async () => {
  const empty = await request("/api/orders", {
    method: "POST",
    body: { ...customer, items: [] }
  });
  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, "El pedido debe incluir al menos un producto");

  const unknown = await request("/api/orders", {
    method: "POST",
    body: { ...customer, items: [{ product_id: 999, quantity: 1 }] }
  });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.message, "El producto 999 no está disponible");

  const badQuantity = await request("/api/orders", {
    method: "POST",
    body: { ...customer, items: [{ product_id: 1, quantity: 0 }] }
  });
  assert.equal(badQuantity.status, 400);
  assert.equal(
    badQuantity.body.message,
    "La cantidad debe ser un número entre 1 y 99"
  );

  const missingAddress = await request("/api/orders", {
    method: "POST",
    body: {
      customer_name: "Ana",
      customer_phone: "8888-1111",
      items: [{ product_id: 1, quantity: 1 }]
    }
  });
  assert.equal(missingAddress.status, 400);
  assert.equal(
    missingAddress.body.message,
    "El campo dirección es obligatorio"
  );
});

test("POST /api/orders merges duplicated products", async () => {
  const { status, body } = await request("/api/orders", {
    method: "POST",
    body: {
      ...customer,
      items: [
        { product_id: 1, quantity: 1 },
        { product_id: 1, quantity: 1 }
      ]
    },
    authToken: token
  });

  assert.equal(status, 201);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].quantity, 2);
  assert.equal(body.total, 5500);
});

test("GET /api/orders requires authentication", async () => {
  const { status, body } = await request("/api/orders");

  assert.equal(status, 401);
  assert.equal(body.message, "Inicia sesión para continuar");
});

test("GET /api/orders lists only the user orders, newest first", async () => {
  const { status, body } = await request("/api/orders", { authToken: token });

  assert.equal(status, 200);
  assert.equal(body.length, 2);
  assert.ok(body.every((order) => order.id !== guestOrderId));
  assert.ok(body.every((order) => order.items.length >= 1));
  assert.ok(Number(body[0].id) > Number(body[1].id));
});

test("GET /api/orders/:id returns own orders and hides the rest", async () => {
  const { body: own } = await request("/api/orders", { authToken: token });
  const ownOrder = own[0];

  const found = await request(`/api/orders/${ownOrder.id}`, {
    authToken: token
  });
  assert.equal(found.status, 200);
  assert.equal(found.body.code, ownOrder.code);

  const foreign = await request(`/api/orders/${guestOrderId}`, {
    authToken: token
  });
  assert.equal(foreign.status, 404);
  assert.equal(foreign.body.message, "Pedido no encontrado");

  const missing = await request("/api/orders/999999", { authToken: token });
  assert.equal(missing.status, 404);

  const invalid = await request("/api/orders/abc", { authToken: token });
  assert.equal(invalid.status, 404);
});
