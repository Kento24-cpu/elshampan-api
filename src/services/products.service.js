import { pool } from "../db/pool.js";
import { serializeProduct } from "../utils/serializers.js";

const PRODUCT_COLUMNS = `
  p.id, p.name, p.brand, p.country, c.name AS category, p.volume, p.price,
  p.old_price, p.stock, p.badge, p.image, p.rating, p.reviews, p.description
`;

export async function listProducts({ category = null, q = null, limit, offset }) {
  const conditions = ["p.is_active = 1"];
  const params = [];

  if (category) {
    conditions.push("c.name = ?");
    params.push(category);
  }

  if (q) {
    conditions.push(
      "(p.name LIKE ? OR p.brand LIKE ? OR p.country LIKE ? OR c.name LIKE ?)"
    );
    const term = `%${q}%`;
    params.push(term, term, term, term);
  }

  params.push(limit, offset);

  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.id
      LIMIT ? OFFSET ?`,
    params
  );

  return rows.map(serializeProduct);
}
