import { Router } from "express";
import {
  createOrderHandler,
  getOrder,
  getOrders
} from "../controllers/orders.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

ordersRouter.post("/", optionalAuth, createOrderHandler);
ordersRouter.get("/", requireAuth, getOrders);
ordersRouter.get("/:id", requireAuth, getOrder);
