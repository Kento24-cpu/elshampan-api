import { ping } from "../db/pool.js";

export async function getHealth(req, res) {
  const dbUp = await ping();

  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "up" : "down"
  });
}
