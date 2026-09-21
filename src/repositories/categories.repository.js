import { getPool } from "../db/pool.js";

const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
  image: row.image
});

export async function listCategories() {
  const [rows] = await getPool().query(
    "SELECT id, name, image FROM categories ORDER BY id"
  );

  return rows.map(mapCategory);
}
