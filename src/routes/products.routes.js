import { Router } from "express";
import { getProduct, getProducts } from "../controllers/products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", getProducts);
productsRouter.get("/:id", getProduct);
