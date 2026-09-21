import { ping } from "../db/pool.js";

export async function getHealth(req, res) {
  const dbUp = await ping();

  res.json({ status: "ok", db: dbUp ? "up" : "down" });
}
