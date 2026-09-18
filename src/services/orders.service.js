import { pool, withTransaction } from "../db/pool.js";
import { conflict, notFound } from "../utils/errors.js";
import { serializeOrder } from "../utils/serializers.js";

const ORDER_COLUMNS = `
  id, code, user_id, customer_name, customer_phone, address, notes, total, status, created_at
`;

async function loadItemsByOrderId(orderIds) {
  if (orderIds.length === 0) {
    return new Map();
  }

  const [rows] = await pool.query(
    `SELECT order_id, product_id, product_name, unit_price, quantity, subtotal
       FROM order_items
      WHERE order_id IN (?)
      ORDER BY id`,
    [orderIds]
  );

  return rows.reduce((grouped, row) => {
    const items = grouped.get(row.order_id) ?? [];
    items.push(row);
    grouped.set(row.order_id, items);
    return grouped;
  }, new Map());
}

export async function createOrder({
  userId,
  customerName,
  customerPhone,
  address,
  notes,
  items
}) {
  const orderId = await withTransaction(async (connection) => {
    const productIds = items.map((item) => item.product_id);

    const [products] = await connection.query(
      `SELECT id, name, price, stock, is_active
         FROM products
        WHERE id IN (?)
        FOR UPDATE`,
      [productIds]
    );

    const productsById = new Map(
      products.map((product) => [product.id, product])
    );

    let total = 0;

    const orderItems = items.map((item) => {
      const product = productsById.get(item.product_id);

      if (!product || !product.is_active) {
        throw notFound(`El producto ${item.product_id} no está disponible`);
      }

      if (product.stock < item.quantity) {
        throw conflict(
          `Stock insuficiente para ${product.name} (disponible: ${product.stock})`
        );
      }

      const subtotal = product.price * item.quantity;
      total += subtotal;

      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal
      };
    });

    const [inserted] = await connection.query(
      `INSERT INTO orders
         (user_id, customer_name, customer_phone, address, notes, total, status)
       VALUES (?, ?, ?, ?, ?, ?, 'recibido')`,
      [userId, customerName, customerPhone, address, notes, total]
    );

    const id = inserted.insertId;
    const code = `EC-${String(id).padStart(6, "0")}`;

    await connection.query("UPDATE orders SET code = ? WHERE id = ?", [
      code,
      id
    ]);

    await connection.query(
      `INSERT INTO order_items
         (order_id, product_id, product_name, unit_price, quantity, subtotal)
       VALUES ?`,
      [
        orderItems.map((item) => [
          id,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity,
          item.subtotal
        ])
      ]
    );

    for (const item of orderItems) {
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    return id;
  });

  return findOrderById(orderId);
}

export async function findOrderById(id) {
  const [rows] = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ? LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const itemsByOrderId = await loadItemsByOrderId([id]);

  return serializeOrder({
    ...rows[0],
    items: itemsByOrderId.get(rows[0].id) ?? []
  });
}
