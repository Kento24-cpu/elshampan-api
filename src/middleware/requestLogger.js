import { config } from "../config/env.js";

const MS_PER_NS = 1e6;

export function createRequestLogger({ level = config.logLevel } = {}) {
  if (level === "silent") {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / MS_PER_NS;

      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    });

    next();
  };
}
