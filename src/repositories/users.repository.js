import { getPool } from "../db/pool.js";

const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone
});

export async function findUserByEmail(email) {
  const [rows] = await getPool().query(
    "SELECT id, name, email, phone, password_hash FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (!rows[0]) return null;

  return { ...mapUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function findUserById(id) {
  const [rows] = await getPool().query(
    "SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser({ name, email, phone, passwordHash }) {
  const [result] = await getPool().query(
    "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
    [name, email, phone ?? null, passwordHash]
  );

  return findUserById(result.insertId);
}

export async function updateUser(id, { name, phone }) {
  await getPool().query(
    "UPDATE users SET name = ?, phone = ? WHERE id = ?",
    [name, phone ?? null, id]
  );

  return findUserById(id);
}
