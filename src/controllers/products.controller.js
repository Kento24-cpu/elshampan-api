import { listProducts } from "../services/products.service.js";
import { optionalString, parsePagination } from "../utils/validate.js";

export async function getProducts(req, res) {
  const { limit, offset } = parsePagination(req.query);
  const category = optionalString(req.query.category, "category", { max: 60 });
  const q = optionalString(req.query.q, "q", { max: 100 });

  const products = await listProducts({ category, q, limit, offset });

  res.json(products);
}
