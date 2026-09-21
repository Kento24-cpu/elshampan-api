import * as categoriesRepository from "../repositories/categories.repository.js";

export async function listCategories(req, res) {
  res.json(await categoriesRepository.listCategories());
}
