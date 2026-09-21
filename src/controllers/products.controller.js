import * as productsRepository from "../repositories/products.repository.js";
import { clampLimit, parsePositiveInt } from "../utils/validation.js";

export async function listProducts(req, res) {
  const { category, search, limit } = req.query;

  res.json(await productsRepository.listProducts({
    category: String(category ?? "").trim() || undefined,
    search: String(search ?? "").trim() || undefined,
    limit: clampLimit(limit) ?? undefined
  }));
}

export async function getProduct(req, res) {
  const id = parsePositiveInt(req.params.id);
  const product = id ? await productsRepository.findProductById(id) : null;

  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }

  res.json(product);
}
