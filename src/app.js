import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { setPool } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { createRequestLogger } from "./middleware/requestLogger.js";
import { createApiRouter } from "./routes/index.js";

const resolveCorsOptions = () => {
  const origins = config.corsOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);

  if (origins.includes("*")) return {};

  return { origin: origins };
};

export function createApp({ pool, authRateLimit, logLevel } = {}) {
  if (pool) setPool(pool);

  const app = express();

  app.disable("x-powered-by");
  app.use(createRequestLogger({ level: logLevel }));
  app.use(cors(resolveCorsOptions()));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", createApiRouter({ authRateLimit }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
