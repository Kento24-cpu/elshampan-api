import { Router } from "express";
import { categoriesRouter } from "./categories.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/categories", categoriesRouter);
