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

const productRow = {
  id: 1,
  name: "Johnnie Walker Black Label",
  brand: "Johnnie Walker",
  country: "Escocia",
  category: "Whisky",
  volume: "750 ml",
  price: "2750.00",
  old_price: "2990.00",
  stock: 12,
  badge: "PREMIUM",
  image: "https://example.com/black-label.png",
  rating: "4.9",
  reviews_count: 124,
  description: "Whisky escocés de 12 años."
};

const catalogPool = () =>
  createFakePool([
    {
      match: (sql) => sql.includes("FROM products p") && sql.includes("WHERE p.id = ?"),
      respond: () => [[productRow]]
    },
    { match: (sql) => sql.includes("FROM products p"), respond: () => [[productRow]] }
  ]);

test("list products maps database columns to the client contract", async () => {
  await withServer(catalogPool(), async (server) => {
    const response = await fetch(`${server.url}/api/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].category, "Whisky");
    assert.equal(body[0].price, 2750);
    assert.equal(body[0].oldPrice, 2990);
    assert.equal(body[0].reviews, 124);
    assert.equal(body[0].rating, 4.9);
    assert.equal(body[0].reviews_count, undefined);
  });
});

test("list products forwards the category filter as a query parameter", async () => {
  const pool = catalogPool();

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/products?category=Ron`);

    assert.equal(response.status, 200);
    assert.deepEqual(pool.calls[0].params, ["Ron"]);
  });
});

test("get product returns a single product", async () => {
  await withServer(catalogPool(), async (server) => {
    const response = await fetch(`${server.url}/api/products/1`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, 1);
    assert.equal(body.name, "Johnnie Walker Black Label");
    assert.equal(body.badge, "PREMIUM");
  });
});

test("get product responds 404 when it does not exist", async () => {
  const pool = createFakePool([
    { match: (sql) => sql.includes("FROM products p"), respond: () => [[]] }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/products/999`);

    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, "Producto no encontrado");
  });
});

test("get product responds 404 for a non numeric id without querying the database", async () => {
  const pool = createFakePool([]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/products/abc`);

    assert.equal(response.status, 404);
    assert.equal(pool.calls.length, 0);
  });
});

test("list categories returns id, name and image", async () => {
  const pool = createFakePool([
    {
      match: (sql) => sql.includes("FROM categories"),
      respond: () => [[{ id: 1, name: "Whisky", image: "https://example.com/whisky.png" }]]
    }
  ]);

  await withServer(pool, async (server) => {
    const response = await fetch(`${server.url}/api/categories`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      { id: 1, name: "Whisky", image: "https://example.com/whisky.png" }
    ]);
  });
});
