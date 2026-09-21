import { Router } from "express";
import { getProduct, listProducts } from "../controllers/products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", listProducts);
productsRouter.get("/:id", getProduct);
