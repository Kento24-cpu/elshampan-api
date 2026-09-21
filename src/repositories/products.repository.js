import { getPool } from "../db/pool.js";

const SELECT_COLUMNS = `
  p.id, p.name, p.brand, p.country, c.name AS category, p.volume,
  p.price, p.old_price, p.stock, p.badge, p.image, p.rating,
  p.reviews_count, p.description
`;

const FROM_PRODUCTS = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

// `%` and `_` are LIKE wildcards, so a user searching for "%" would match everything.
const escapeLike = (value) => value.replace(/[\\%_]/g, (character) => `\\${character}`);

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  country: row.country,
  category: row.category,
  volume: row.volume,
  price: Number(row.price),
  oldPrice: row.old_price === null ? null : Number(row.old_price),
  stock: row.stock,
  badge: row.badge,
  image: row.image,
  rating: Number(row.rating),
  reviews: row.reviews_count,
  description: row.description
});

export async function listProducts({ category, search, limit } = {}) {
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push("c.name = ?");
    params.push(category);
  }

  if (search) {
    const term = `%${escapeLike(search)}%`;

    conditions.push("(p.name LIKE ? OR p.brand LIKE ?)");
    params.push(term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const max = Number.isInteger(limit) && limit > 0 ? `LIMIT ${limit}` : "";

  const [rows] = await getPool().query(
    `SELECT ${SELECT_COLUMNS} ${FROM_PRODUCTS} ${where} ORDER BY p.id ${max}`,
    params
  );

  return rows.map(mapProduct);
}

export async function findProductById(id) {
  const [rows] = await getPool().query(
    `SELECT ${SELECT_COLUMNS} ${FROM_PRODUCTS} WHERE p.id = ? LIMIT 1`,
    [id]
  );

  return rows[0] ? mapProduct(rows[0]) : null;
}
