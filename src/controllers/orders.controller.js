import {
  createOrder,
  findOrderForUser,
  listOrdersForUser
} from "../services/orders.service.js";
import { badRequest, notFound } from "../utils/errors.js";
import {
  optionalString,
  parseId,
  parsePagination,
  requireString
} from "../utils/validate.js";

const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

function parseOrderItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest("El pedido debe incluir al menos un producto");
  }

  if (value.length > MAX_ITEMS) {
    throw badRequest(`El pedido no puede tener más de ${MAX_ITEMS} productos`);
  }

  const quantitiesByProduct = new Map();

  for (const item of value) {
    const productId = parseId(item?.product_id);
    const quantity = Number(item?.quantity);

    if (productId === null) {
      throw badRequest("El campo product_id es inválido");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw badRequest(
        `La cantidad debe ser un número entre 1 y ${MAX_QUANTITY}`
      );
    }

    const accumulated = (quantitiesByProduct.get(productId) ?? 0) + quantity;

    if (accumulated > MAX_QUANTITY) {
      throw badRequest(
        `La cantidad debe ser un número entre 1 y ${MAX_QUANTITY}`
      );
    }

    quantitiesByProduct.set(productId, accumulated);
  }

  return [...quantitiesByProduct].map(([product_id, quantity]) => ({
    product_id,
    quantity
  }));
}

export async function createOrderHandler(req, res) {
  const customerName = requireString(req.body.customer_name, "nombre", {
    max: 120
  });
  const customerPhone = requireString(req.body.customer_phone, "teléfono", {
    max: 30
  });
  const address = requireString(req.body.address, "dirección", { max: 400 });
  const notes = optionalString(req.body.notes, "notas", { max: 400 });
  const items = parseOrderItems(req.body.items);

  const order = await createOrder({
    userId: req.user?.id ?? null,
    customerName,
    customerPhone,
    address,
    notes,
    items
  });

  res.status(201).json(order);
}

export async function getOrders(req, res) {
  const { limit, offset } = parsePagination(req.query);

  const orders = await listOrdersForUser(req.user.id, { limit, offset });

  res.json(orders);
}

export async function getOrder(req, res) {
  const id = parseId(req.params.id);
  const order = id === null ? null : await findOrderForUser(id, req.user.id);

  if (!order) {
    throw notFound("Pedido no encontrado");
  }

  res.json(order);
}
