import * as productsRepository from "../repositories/products.repository.js";

const parseId = (value) => {
  const id = Number.parseInt(value, 10);

  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function listProducts(req, res) {
  const { category, search, limit } = req.query;

  res.json(await productsRepository.listProducts({
    category: String(category ?? "").trim() || undefined,
    search: String(search ?? "").trim() || undefined,
    limit: parseId(limit) ?? undefined
  }));
}

export async function getProduct(req, res) {
  const id = parseId(req.params.id);
  const product = id ? await productsRepository.findProductById(id) : null;

  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }

  res.json(product);
}
