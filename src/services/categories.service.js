import { pool } from "../db/pool.js";
import { serializeCategory } from "../utils/serializers.js";

export async function listCategories() {
  const [rows] = await pool.query(
    "SELECT id, name, image FROM categories ORDER BY id"
  );

  return rows.map(serializeCategory);
}
