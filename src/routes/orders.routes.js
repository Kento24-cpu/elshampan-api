import { Router } from "express";
import { createOrderHandler } from "../controllers/orders.controller.js";
import { optionalAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

ordersRouter.post("/", optionalAuth, createOrderHandler);
