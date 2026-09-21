import { getPool } from "../db/pool.js";

export async function createSession({ userId, token, expiresAt }) {
  await getPool().query(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );
}

export async function findUserByToken(token) {
  const [rows] = await getPool().query(
    `SELECT u.id, u.name, u.email, u.phone
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > NOW()
      LIMIT 1`,
    [token]
  );

  return rows[0] ?? null;
}

export async function deleteSession(token) {
  await getPool().query("DELETE FROM sessions WHERE token = ?", [token]);
}
