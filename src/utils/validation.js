import { httpError } from "./httpError.js";

// Mirrors the column widths declared in db/schema.sql.
export const LIMITS = {
  userName: 120,
  userEmail: 150,
  userPhone: 40,
  customerName: 120,
  customerPhone: 40,
  address: 300,
  notes: 500,
  passwordMin: 6,
  // bcrypt only reads the first 72 bytes of the input.
  passwordMaxBytes: 72,
  orderLines: 50,
  productsLimit: 100
};

export function requireText(value, label, max) {
  const text = String(value ?? "").trim();

  if (!text) throw httpError(400, `${label} es obligatorio`);
  if (text.length > max) throw httpError(400, `${label} no puede superar los ${max} caracteres`);

  return text;
}

export function optionalText(value, label, max) {
  const text = String(value ?? "").trim();

  if (!text) return null;
  if (text.length > max) throw httpError(400, `${label} no puede superar los ${max} caracteres`);

  return text;
}

export function parsePositiveInt(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  const text = String(value ?? "").trim();

  return /^[1-9]\d*$/.test(text) ? Number(text) : null;
}

export function clampLimit(value, max = LIMITS.productsLimit) {
  const parsed = parsePositiveInt(value);

  return parsed ? Math.min(parsed, max) : null;
}
