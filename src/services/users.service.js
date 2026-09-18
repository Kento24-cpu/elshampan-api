import { pool } from "../db/pool.js";
import { conflict } from "../utils/errors.js";
import { serializeUser } from "../utils/serializers.js";

const USER_COLUMNS = "id, name, email, phone";

export async function createUser({ name, email, passwordHash, phone }) {
  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, phone]
    );

    return findUserById(result.insertId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw conflict("Ese correo ya está registrado");
    }

    throw error;
  }
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows.length > 0 ? serializeUser(rows[0]) : null;
}

export async function findUserWithPasswordByEmail(email) {
  const [rows] = await pool.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  return rows[0] ?? null;
}

export async function updateUser(id, { name, phone }) {
  const fields = [];
  const params = [];

  if (name !== null) {
    fields.push("name = ?");
    params.push(name);
  }

  if (phone !== null) {
    fields.push("phone = ?");
    params.push(phone);
  }

  params.push(id);

  await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);

  return findUserById(id);
}
