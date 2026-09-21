import mysql from "mysql2/promise";
import { config } from "../config/env.js";

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return pool;
}

export function setPool(nextPool) {
  pool = nextPool;
}

export async function ping() {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closePool() {
  if (!pool) return;

  const current = pool;
  pool = null;
  await current.end();
}
