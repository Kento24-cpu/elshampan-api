import cors from "cors";
import express from "express";
import { setPool } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { apiRouter } from "./routes/index.js";

export function createApp({ pool } = {}) {
  if (pool) setPool(pool);

  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
