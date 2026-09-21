import * as ordersRepository from "../repositories/orders.repository.js";

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const mergeItems = (rawItems) => {
  const merged = new Map();

  for (const raw of rawItems) {
    const productId = parsePositiveInt(raw?.product_id);
    const quantity = parsePositiveInt(raw?.quantity);

    if (!productId) throw httpError(400, "Los productos del pedido no son válidos");
    if (!quantity) throw httpError(400, "Las cantidades del pedido no son válidas");

    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }));
};

export async function createOrder(userId, body = {}) {
  const customerName = String(body.customer_name ?? "").trim();
  const customerPhone = String(body.customer_phone ?? "").trim();
  const address = String(body.address ?? "").trim();
  const notes = String(body.notes ?? "").trim() || null;
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!customerName) throw httpError(400, "El nombre del cliente es obligatorio");
  if (!customerPhone) throw httpError(400, "El teléfono del cliente es obligatorio");
  if (!address) throw httpError(400, "La dirección de entrega es obligatoria");
  if (rawItems.length === 0) throw httpError(400, "El pedido debe incluir al menos un producto");

  return ordersRepository.createOrder({
    userId: userId ?? null,
    customerName,
    customerPhone,
    address,
    notes,
    items: mergeItems(rawItems)
  });
}

export function listOrders(userId) {
  return ordersRepository.listOrdersByUser(userId);
}

export async function getOrder(userId, orderId) {
  const id = parsePositiveInt(orderId);
  const order = id ? await ordersRepository.findOrderByUser(userId, id) : null;

  if (!order) throw httpError(404, "Pedido no encontrado");

  return order;
}
