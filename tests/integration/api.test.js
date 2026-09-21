import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, test } from "node:test";
import * as ordersRepository from "../../src/repositories/orders.repository.js";
import { startTestServer } from "../helpers/server.js";
import { countRows, isEnabled, prepareTestDatabase } from "./setup.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// These tests are the only ones that execute real SQL. They are skipped unless
// RUN_DB_TESTS=1 and they only ever touch the elshampan_test database.
const enabled = isEnabled();
const dbTest = enabled ? test : test.skip;

let pool;
let server;
let url;

before(async () => {
  if (!enabled) return;

  pool = await prepareTestDatabase();
  server = await startTestServer({ pool });
  url = server.url;
});

after(async () => {
  if (server) await server.close();
  if (pool) await pool.end();
});

const request = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return { status: response.status, body: await response.json().catch(() => null) };
};

const login = async (email, password) => {
  const { body } = await request("/api/auth/login", { method: "POST", body: { email, password } });

  return body.token;
};

const stockOf = async (productId) => {
  const [rows] = await pool.query("SELECT stock FROM products WHERE id = ?", [productId]);

  return rows[0].stock;
};

const uniqueEmail = () => `integration-${Date.now()}-${Math.random().toString(16).slice(2)}@elshampan.com`;

const checkoutBody = (overrides = {}) => ({
  customer_name: "Juan Pérez",
  customer_phone: "8888-8888",
  address: "Barrio Central, casa 4",
  items: [{ product_id: 1, quantity: 1 }],
  ...overrides
});

dbTest("products come from the database with the client contract shape", async () => {
  const { status, body } = await request("/api/products");

  assert.equal(status, 200);
  assert.equal(body.length, 17);

  const discounted = body.find((product) => product.name === "Johnnie Walker Black Label");

  assert.equal(discounted.category, "Whisky");
  assert.equal(discounted.price, 2750);
  assert.equal(discounted.oldPrice, 2990);
  assert.equal(discounted.rating, 4.9);
  assert.equal(discounted.reviews, 124);
  assert.equal(typeof discounted.price, "number");

  const regular = body.find((product) => product.name === "Corona Extra 6 Pack");

  assert.equal(regular.oldPrice, null);
});

dbTest("categories come from the database", async () => {
  const { status, body } = await request("/api/categories");

  assert.equal(status, 200);
  assert.equal(body.length, 7);
  assert.ok(body.some((category) => category.name === "Whisky"));
});

dbTest("products can be filtered by category name", async () => {
  const { body } = await request("/api/products?category=Ron");

  assert.equal(body.length, 3);
  assert.ok(body.every((product) => product.category === "Ron"));
});

dbTest("product search matches on name and brand", async () => {
  const { body } = await request("/api/products?search=corona");

  assert.equal(body.length, 1);
  assert.equal(body[0].name, "Corona Extra 6 Pack");
});

dbTest("product search does not treat the percent sign as a wildcard", async () => {
  const { body } = await request("/api/products?search=%25");

  assert.deepEqual(body, []);
});

dbTest("the page size is capped", async () => {
  const { body } = await request("/api/products?limit=5");

  assert.equal(body.length, 5);
});

dbTest("a single product is returned by id and unknown ids are a 404", async () => {
  const found = await request("/api/products/1");

  assert.equal(found.status, 200);
  assert.equal(found.body.name, "Johnnie Walker Black Label");

  const missing = await request("/api/products/9999");

  assert.equal(missing.status, 404);
});

dbTest("the seeded demo account can log in", async () => {
  const { status, body } = await request("/api/auth/login", {
    method: "POST",
    body: { email: "demo@elshampan.com", password: "Demo1234" }
  });

  assert.equal(status, 200);
  assert.equal(body.user.email, "demo@elshampan.com");
  assert.equal(body.token.length, 64);
});

dbTest("an account can be registered, logged in and updated", async () => {
  const email = uniqueEmail();

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Ana Torres", email, password: "Secret123", phone: "8888-1111" }
  });

  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.email, email);

  const me = await request("/api/auth/me", { token: registered.body.token });

  assert.equal(me.status, 200);
  assert.equal(me.body.email, email);

  const session = await request("/api/auth/login", { method: "POST", body: { email, password: "Secret123" } });

  assert.equal(session.status, 200);

  const updated = await request("/api/auth/me", {
    method: "PATCH",
    token: session.body.token,
    body: { name: "Ana Actualizada", phone: "7777-2222" }
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "Ana Actualizada");

  const reread = await request("/api/auth/me", { token: session.body.token });

  assert.equal(reread.body.name, "Ana Actualizada");
  assert.equal(reread.body.phone, "7777-2222");
});

dbTest("registering an email that already exists returns 409", async () => {
  const email = uniqueEmail();
  const body = { name: "Repetida", email, password: "Secret123" };

  assert.equal((await request("/api/auth/register", { method: "POST", body })).status, 201);
  assert.equal((await request("/api/auth/register", { method: "POST", body })).status, 409);
});

dbTest("an unknown session token is rejected", async () => {
  const { status } = await request("/api/auth/me", { token: "f".repeat(64) });

  assert.equal(status, 401);
});

dbTest("a guest order is stored without a user and decrements stock", async () => {
  const stockBefore = await stockOf(1);
  const { status, body } = await request("/api/orders", { method: "POST", body: checkoutBody() });

  assert.equal(status, 201);
  assert.equal(body.code, `ESH-${String(body.id).padStart(6, "0")}`);
  assert.equal(body.total, 2750);

  const [orders] = await pool.query("SELECT user_id, total FROM orders WHERE id = ?", [body.id]);

  assert.equal(orders[0].user_id, null);
  assert.equal(Number(orders[0].total), 2750);

  const [items] = await pool.query("SELECT product_name, quantity, subtotal FROM order_items WHERE order_id = ?", [body.id]);

  assert.equal(items.length, 1);
  assert.equal(items[0].product_name, "Johnnie Walker Black Label");
  assert.equal(Number(items[0].subtotal), 2750);
  assert.equal(await stockOf(1), stockBefore - 1);
});

dbTest("an authenticated order is linked to its user", async () => {
  const token = await login("demo@elshampan.com", "Demo1234");
  const { status, body } = await request("/api/orders", {
    method: "POST",
    token,
    body: checkoutBody({ items: [{ product_id: 2, quantity: 2 }] })
  });

  assert.equal(status, 201);
  assert.equal(body.total, 2800);

  const [users] = await pool.query("SELECT id FROM users WHERE email = ?", ["demo@elshampan.com"]);
  const [orders] = await pool.query("SELECT user_id FROM orders WHERE id = ?", [body.id]);

  assert.equal(orders[0].user_id, users[0].id);
});

dbTest("an order over the available stock is rejected without writing anything", async () => {
  const stockBefore = await stockOf(2);
  const ordersBefore = await countRows(pool, "orders");
  const itemsBefore = await countRows(pool, "order_items");

  const { status } = await request("/api/orders", {
    method: "POST",
    body: checkoutBody({ items: [{ product_id: 2, quantity: 99999 }] })
  });

  assert.equal(status, 409);
  assert.equal(await countRows(pool, "orders"), ordersBefore);
  assert.equal(await countRows(pool, "order_items"), itemsBefore);
  assert.equal(await stockOf(2), stockBefore);
});

dbTest("a failure after the transaction opens leaves no partial state", async () => {
  const stockBefore = await stockOf(1);
  const ordersBefore = await countRows(pool, "orders");
  const itemsBefore = await countRows(pool, "order_items");

  // Bypasses the service validation on purpose: quantity 0 violates the
  // chk_order_items_quantity CHECK, which fails after the order row is inserted.
  await assert.rejects(() =>
    ordersRepository.createOrder({
      userId: null,
      customerName: "Juan Pérez",
      customerPhone: "8888-8888",
      address: "Barrio Central, casa 4",
      notes: null,
      items: [{ product_id: 1, quantity: 0 }]
    })
  );

  assert.equal(await countRows(pool, "orders"), ordersBefore);
  assert.equal(await countRows(pool, "order_items"), itemsBefore);
  assert.equal(await stockOf(1), stockBefore);
});

dbTest("order history returns the orders of the session user with their items", async () => {
  const token = await login("demo@elshampan.com", "Demo1234");
  const { status, body } = await request("/api/orders", { token });

  assert.equal(status, 200);
  assert.ok(body.length >= 1);

  const [order] = body;

  assert.match(order.code, /^ESH-\d{6}$/);
  assert.equal(order.status, "pendiente");
  assert.match(order.date, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(order.items.length, 1);
  assert.equal(typeof order.items[0].unit_price, "number");

  const detail = await request(`/api/orders/${order.id}`, { token });

  assert.equal(detail.status, 200);
  assert.equal(detail.body.code, order.code);
});

dbTest("a user cannot read another user's order", async () => {
  const demoToken = await login("demo@elshampan.com", "Demo1234");
  const { body: history } = await request("/api/orders", { token: demoToken });

  const email = uniqueEmail();
  const registered = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Otra Persona", email, password: "Secret123" }
  });

  const { status } = await request(`/api/orders/${history[0].id}`, { token: registered.body.token });

  assert.equal(status, 404);
});

dbTest("the session token is stored hashed and logout revokes it", async () => {
  const session = await request("/api/auth/login", {
    method: "POST",
    body: { email: "demo@elshampan.com", password: "Demo1234" }
  });
  const { token } = session.body;
  const [rows] = await pool.query("SELECT token FROM sessions WHERE token = ?", [sha256(token)]);

  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token, token);

  const [raw] = await pool.query("SELECT COUNT(*) AS total FROM sessions WHERE token = ?", [token]);

  assert.equal(raw[0].total, 0);

  const loggedOut = await request("/api/auth/logout", { method: "POST", token });

  assert.equal(loggedOut.status, 204);

  const afterLogout = await request("/api/auth/me", { token });

  assert.equal(afterLogout.status, 401);
});
