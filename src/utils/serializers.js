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

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

export function serializeOrderItem(row) {
  return {
    product_id: String(row.product_id),
    name: row.product_name,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    subtotal: Number(row.subtotal)
  };
}

export function serializeOrder(row) {
  return {
    id: String(row.id),
    code: row.code,
    date: formatDate(row.created_at),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    status: row.status,
    total: Number(row.total),
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    address: row.address,
    notes: row.notes ?? null,
    items: (row.items ?? []).map(serializeOrderItem)
  };
}
