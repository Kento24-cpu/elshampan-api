import { Router } from "express";
import { createAuthRouter } from "./auth.routes.js";
import { categoriesRouter } from "./categories.routes.js";
import { healthRouter } from "./health.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { productsRouter } from "./products.routes.js";

export function createApiRouter({ authRateLimit } = {}) {
  const apiRouter = Router();

  apiRouter.use("/health", healthRouter);
  apiRouter.use("/auth", createAuthRouter({ rateLimit: authRateLimit }));
  apiRouter.use("/categories", categoriesRouter);
  apiRouter.use("/products", productsRouter);
  apiRouter.use("/orders", ordersRouter);

  return apiRouter;
}
