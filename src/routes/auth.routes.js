import { Router } from "express";
import { login, logout, me, register, updateMe } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { createAuthRateLimit } from "../middleware/rateLimit.js";

export function createAuthRouter({ rateLimit: rateLimitOptions } = {}) {
  const authRouter = Router();
  const limitAttempts = createAuthRateLimit(rateLimitOptions);

  authRouter.post("/register", limitAttempts, register);
  authRouter.post("/login", limitAttempts, login);
  authRouter.post("/logout", requireAuth, logout);
  authRouter.get("/me", requireAuth, me);
  authRouter.patch("/me", requireAuth, updateMe);

  return authRouter;
}
