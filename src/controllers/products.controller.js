import { getProductById, listProducts } from "../services/products.service.js";
import { notFound } from "../utils/errors.js";
import { optionalString, parseId, parsePagination } from "../utils/validate.js";

export async function getProducts(req, res) {
  const { limit, offset } = parsePagination(req.query);
  const category = optionalString(req.query.category, "category", { max: 60 });
  const q = optionalString(req.query.q, "q", { max: 100 });

  const products = await listProducts({ category, q, limit, offset });

  res.json(products);
}

export async function getProduct(req, res) {
  const id = parseId(req.params.id);

  if (id === null) {
    throw notFound("Producto no encontrado");
  }

  const product = await getProductById(id);

  res.json(product);
}
