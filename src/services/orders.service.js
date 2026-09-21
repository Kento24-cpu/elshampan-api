import * as ordersRepository from "../repositories/orders.repository.js";
import { httpError } from "../utils/httpError.js";
import { LIMITS, optionalText, parsePositiveInt, requireText } from "../utils/validation.js";

const mergeItems = (rawItems) => {
  const merged = new Map();

  for (const raw of rawItems) {
    const productId = parsePositiveInt(raw?.product_id);
    const quantity = parsePositiveInt(raw?.quantity);

    if (!productId) throw httpError(400, "Los productos del pedido no son válidos");
    if (!quantity) throw httpError(400, "Las cantidades del pedido no son válidas");

    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  if (merged.size > LIMITS.orderLines) {
    throw httpError(400, `Un pedido no puede incluir más de ${LIMITS.orderLines} productos distintos`);
  }

  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }));
};

export async function createOrder(userId, body = {}) {
  const customerName = requireText(body.customer_name, "El nombre del cliente", LIMITS.customerName);
  const customerPhone = requireText(body.customer_phone, "El teléfono del cliente", LIMITS.customerPhone);
  const address = requireText(body.address, "La dirección de entrega", LIMITS.address);
  const notes = optionalText(body.notes, "Las notas", LIMITS.notes);
  const rawItems = Array.isArray(body.items) ? body.items : [];

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
