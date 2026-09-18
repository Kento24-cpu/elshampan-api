export function serializeCategory(row) {
  return {
    id: String(row.id),
    name: row.name,
    image: row.image ?? null
  };
}

export function serializeUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? null
  };
}

export function serializeProduct(row) {
  return {
    id: String(row.id),
    name: row.name,
    brand: row.brand,
    country: row.country,
    category: row.category,
    volume: row.volume,
    price: Number(row.price),
    oldPrice: row.old_price === null ? null : Number(row.old_price),
    stock: Number(row.stock),
    badge: row.badge ?? null,
    image: row.image,
    rating: Number(row.rating),
    reviews: Number(row.reviews),
    description: row.description ?? null
  };
}
