import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config/env.js";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(scriptsDir, "..", "src", "db");

const flags = new Set(process.argv.slice(2));
const reset = flags.has("--reset");
const seed = !flags.has("--no-seed");
const quiet = flags.has("--quiet");

const log = (message) => {
  if (!quiet) {
    console.log(message);
  }
};

async function applySqlFile(connection, file) {
  const sql = await readFile(path.join(dbDir, file), "utf8");
  await connection.query(sql);
}

async function main() {
  const { host, port, user, password, database } = config.db;

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    if (reset) {
      log(`Dropping database ${database}`);
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    }

    log(`Creating database ${database}`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${database}\``);

    log("Applying schema");
    await applySqlFile(connection, "schema.sql");

    if (seed) {
      log("Applying seed data");
      await applySqlFile(connection, "seed.sql");
    }

    log(`Database ${database} is ready`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
