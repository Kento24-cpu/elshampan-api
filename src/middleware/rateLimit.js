import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";

export function createAuthRateLimit({
  windowMs = config.authRateLimitWindowMs,
  limit = config.authRateLimitLimit
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo" });
    }
  });
}
