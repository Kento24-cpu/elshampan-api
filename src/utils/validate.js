import { badRequest } from "./errors.js";

export function requireString(value, label, { min = 1, max = 255 } = {}) {
  const text = typeof value === "string" ? value.trim() : "";

  if (text.length < min) {
    throw badRequest(`${label} es obligatorio`);
  }

  if (text.length > max) {
    throw badRequest(`${label} no puede superar ${max} caracteres`);
  }

  return text;
}

export function optionalString(value, label, { max = 255 } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();

  if (text.length > max) {
    throw badRequest(`${label} no puede superar ${max} caracteres`);
  }

  return text.length > 0 ? text : null;
}

export function parsePagination(query = {}) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw badRequest("limit inválido");
  }

  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) {
    throw badRequest("offset inválido");
  }

  return { limit, offset };
}

export function parseId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  return id;
}
