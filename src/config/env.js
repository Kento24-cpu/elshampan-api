import dotenv from "dotenv";

dotenv.config({ quiet: true });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 3000),
  host: process.env.HOST ?? "0.0.0.0",
  sessionTtlDays: toInt(process.env.SESSION_TTL_DAYS, 7),
  corsOrigins: process.env.CORS_ORIGINS ?? "*",
  authRateLimitWindowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitLimit: toInt(process.env.AUTH_RATE_LIMIT_LIMIT, 20),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "elshampan"
  }
};
