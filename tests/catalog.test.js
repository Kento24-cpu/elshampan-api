import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool } from "../src/db/pool.js";
import { startTestServer, stopTestServer } from "./helpers/server.js";

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await stopTestServer(server);
});

const getJson = async (path) => {
  const response = await fetch(`${server.url}${path}`);
  return { status: response.status, body: await response.json() };
};

test("GET /api/categories returns the seven seeded categories", async () => {
  const { status, body } = await getJson("/api/categories");

  assert.equal(status, 200);
  assert.equal(body.length, 7);
  assert.equal(body[0].id, "1");
  assert.equal(body[0].name, "Whisky");
  assert.equal(typeof body[0].image, "string");
});

test("GET /api/products returns the seeded catalog", async () => {
  const { status, body } = await getJson("/api/products");

  assert.equal(status, 200);
  assert.equal(body.length, 17);

  const product = body[0];
  assert.equal(product.id, "1");
  assert.equal(product.name, "Johnnie Walker Black Label");
  assert.equal(product.category, "Whisky");
  assert.equal(product.price, 2750);
  assert.equal(product.oldPrice, 2990);
  assert.equal(product.rating, 4.9);
  assert.equal(typeof product.reviews, "number");
});

test("GET /api/products filters by category name", async () => {
  const { status, body } = await getJson("/api/products?category=Whisky");

  assert.equal(status, 200);
  assert.equal(body.length, 4);
  assert.ok(body.every((product) => product.category === "Whisky"));
});

test("GET /api/products searches by name, brand, country and category", async () => {
  const byName = await getJson("/api/products?q=corona");
  assert.equal(byName.body.length, 1);
  assert.equal(byName.body[0].name, "Corona Extra 6 Pack");

  const byCountry = await getJson("/api/products?q=Nicaragua");
  assert.ok(byCountry.body.length >= 6);

  const byBrand = await getJson("/api/products?q=jack%20daniel");
  assert.equal(byBrand.body.length, 2);
});

test("GET /api/products paginates with limit and offset", async () => {
  const firstPage = await getJson("/api/products?limit=5");
  assert.equal(firstPage.body.length, 5);

  const secondPage = await getJson("/api/products?limit=5&offset=5");
  assert.equal(secondPage.body.length, 5);
  assert.notEqual(firstPage.body[0].id, secondPage.body[0].id);

  const rest = await getJson("/api/products?limit=200&offset=15");
  assert.equal(rest.body.length, 2);
});

test("GET /api/products rejects invalid pagination values", async () => {
  const invalidLimit = await getJson("/api/products?limit=500");
  assert.equal(invalidLimit.status, 400);
  assert.equal(invalidLimit.body.message, "limit inválido");

  const invalidOffset = await getJson("/api/products?offset=abc");
  assert.equal(invalidOffset.status, 400);
  assert.equal(invalidOffset.body.message, "offset inválido");
});

test("GET /api/products/:id returns a product or 404", async () => {
  const found = await getJson("/api/products/13");
  assert.equal(found.status, 200);
  assert.equal(found.body.name, "Corona Extra 6 Pack");

  const missing = await getJson("/api/products/999");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, "Producto no encontrado");

  const invalid = await getJson("/api/products/abc");
  assert.equal(invalid.status, 404);
  assert.equal(invalid.body.message, "Producto no encontrado");
});

test("inactive products are hidden from the catalog", async () => {
  const [inserted] = await pool.query(
    `INSERT INTO products
       (category_id, name, brand, country, volume, price, stock, image, rating, reviews, is_active)
     VALUES (1, 'Producto Inactivo', 'Test', 'Nicaragua', '750 ml', 100, 5, 'https://example.com/inactivo.jpg', 4.0, 1, 0)`
  );

  try {
    const listed = await getJson("/api/products?q=Producto%20Inactivo");
    assert.equal(listed.body.length, 0);

    const detail = await getJson(`/api/products/${inserted.insertId}`);
    assert.equal(detail.status, 404);
  } finally {
    await pool.query("DELETE FROM products WHERE id = ?", [inserted.insertId]);
  }
});
