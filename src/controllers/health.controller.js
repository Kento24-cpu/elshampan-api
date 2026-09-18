import { pool } from "../db/pool.js";

export async function getHealth(req, res) {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({
      status: "error",
      db: "down",
      message: "La base de datos no responde"
    });
  }
}
