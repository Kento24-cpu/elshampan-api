import { Router } from "express";
import { createOrder, getOrder, listOrders } from "../controllers/orders.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

ordersRouter.post("/", optionalAuth, createOrder);
ordersRouter.get("/", requireAuth, listOrders);
ordersRouter.get("/:id", requireAuth, getOrder);
