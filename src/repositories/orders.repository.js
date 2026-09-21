import { getPool } from "../db/pool.js";

const SELECT_ORDER_COLUMNS =
  "id, code, status, address, total, customer_name, customer_phone, notes, created_at";

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const pad = (value) => String(value).padStart(2, "0");

const formatDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join(" ");
};

const mapOrderItem = (row) => ({
  product_id: row.product_id,
  product_name: row.product_name,
  quantity: row.quantity,
  unit_price: Number(row.unit_price),
  subtotal: Number(row.subtotal)
});

const mapOrder = (row, items) => ({
  id: row.id,
  code: row.code,
  status: row.status,
  date: formatDate(row.created_at),
  address: row.address,
  total: Number(row.total),
  customer_name: row.customer_name,
  customer_phone: row.customer_phone,
  notes: row.notes,
  items
});

async function findItemsByOrderIds(orderIds) {
  const [rows] = await getPool().query(
    `SELECT order_id, product_id, product_name, unit_price, quantity, subtotal
       FROM order_items
      WHERE order_id IN (${orderIds.map(() => "?").join(", ")})
      ORDER BY id`,
    orderIds
  );

  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.order_id)) grouped.set(row.order_id, []);
    grouped.get(row.order_id).push(mapOrderItem(row));
  }

  return grouped;
}

export async function createOrder({ userId, customerName, customerPhone, address, notes, items }) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const productIds = items.map((item) => item.product_id);
    const [productRows] = await connection.query(
      `SELECT id, name, price, stock
         FROM products
        WHERE id IN (${productIds.map(() => "?").join(", ")})
        FOR UPDATE`,
      productIds
    );

    const products = new Map(productRows.map((row) => [row.id, row]));

    const lines = items.map((item) => {
      const product = products.get(item.product_id);

      if (!product) throw httpError(400, `El producto ${item.product_id} no existe`);
      if (product.stock < item.quantity) throw httpError(409, `Stock insuficiente para ${product.name}`);

      const unitPrice = Number(product.price);

      return {
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity
      };
    });

    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

    const [inserted] = await connection.query(
      `INSERT INTO orders (user_id, customer_name, customer_phone, address, notes, total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, customerName, customerPhone, address, notes, total]
    );

    const orderId = inserted.insertId;
    const code = `ESH-${String(orderId).padStart(6, "0")}`;

    await connection.query("UPDATE orders SET code = ? WHERE id = ?", [code, orderId]);

    for (const line of lines) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.productName, line.unitPrice, line.quantity, line.subtotal]
      );

      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [line.quantity, line.productId]
      );
    }

    await connection.commit();

    return {
      id: orderId,
      code,
      status: "pendiente",
      address,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes,
      items: lines.map((line) => ({
        product_id: line.productId,
        product_name: line.productName,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        subtotal: line.subtotal
      }))
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listOrdersByUser(userId) {
  const [orders] = await getPool().query(
    `SELECT ${SELECT_ORDER_COLUMNS} FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId]
  );

  if (orders.length === 0) return [];

  const items = await findItemsByOrderIds(orders.map((order) => order.id));

  return orders.map((order) => mapOrder(order, items.get(order.id) ?? []));
}

export async function findOrderByUser(userId, orderId) {
  const [orders] = await getPool().query(
    `SELECT ${SELECT_ORDER_COLUMNS} FROM orders WHERE id = ? AND user_id = ? LIMIT 1`,
    [orderId, userId]
  );

  if (!orders[0]) return null;

  const items = await findItemsByOrderIds([orderId]);

  return mapOrder(orders[0], items.get(orderId) ?? []);
}
