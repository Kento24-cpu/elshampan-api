import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../../src/config/env.js";

export const TEST_DATABASE = "elshampan_test";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The scripts target the real database, so point them at a throwaway one.
const retarget = (sql) =>
  sql
    .replace(/CREATE DATABASE IF NOT EXISTS elshampan\b/g, `CREATE DATABASE IF NOT EXISTS ${TEST_DATABASE}`)
    .replace(/^USE elshampan;/gm, `USE ${TEST_DATABASE};`);

const readScript = async (file) => retarget(await fs.readFile(path.join(PROJECT_ROOT, "db", file), "utf8"));

const credentials = () => ({
  host: process.env.TEST_DB_HOST ?? config.db.host,
  port: Number.parseInt(process.env.TEST_DB_PORT ?? String(config.db.port), 10),
  user: process.env.TEST_DB_USER ?? config.db.user,
  password: process.env.TEST_DB_PASSWORD ?? config.db.password
});

export const isEnabled = () => process.env.RUN_DB_TESTS === "1";

// The integration suite is the only thing that actually executes SQL: the unit
// tests stub the pool out, so a misspelled column or a deleted INSERT would not
// be caught by them.
export async function prepareTestDatabase() {
  const connection = await mysql.createConnection({ ...credentials(), multipleStatements: true });

  try {
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS ${TEST_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch (error) {
      throw new Error(
        `No se pudo crear ${TEST_DATABASE} (${error.code}). Crea la base y concede permisos:\n` +
          `  CREATE DATABASE IF NOT EXISTS ${TEST_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n` +
          `  GRANT ALL PRIVILEGES ON ${TEST_DATABASE}.* TO '${credentials().user}'@'localhost';`,
        { cause: error }
      );
    }

    await connection.query(`USE ${TEST_DATABASE}`);
    await connection.query(await readScript("schema.sql"));

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of ["order_items", "orders", "sessions", "products", "categories", "users"]) {
      await connection.query(`TRUNCATE TABLE ${table}`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    await connection.query(await readScript("seed.sql"));
  } finally {
    await connection.end();
  }

  return mysql.createPool({ ...credentials(), database: TEST_DATABASE, waitForConnections: true, connectionLimit: 5 });
}

export async function countRows(pool, table) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);

  return rows[0].total;
}
