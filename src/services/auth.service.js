import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";
import * as sessionsRepository from "../repositories/sessions.repository.js";
import * as usersRepository from "../repositories/users.repository.js";

const BCRYPT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const issueToken = async (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * MS_PER_DAY);

  await sessionsRepository.createSession({ userId, token, expiresAt });

  return token;
};

export async function register({ name, email, password, phone } = {}) {
  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim();

  if (!cleanName) throw httpError(400, "El nombre es obligatorio");
  if (!cleanEmail) throw httpError(400, "El correo es obligatorio");
  if (!EMAIL_PATTERN.test(cleanEmail)) throw httpError(400, "El correo no es válido");
  if (!password || String(password).length < 6) {
    throw httpError(400, "La contraseña debe tener al menos 6 caracteres");
  }

  const normalizedEmail = normalizeEmail(cleanEmail);

  if (await usersRepository.findUserByEmail(normalizedEmail)) {
    throw httpError(409, "El correo ya está registrado");
  }

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const user = await usersRepository.createUser({
    name: cleanName,
    email: normalizedEmail,
    phone: String(phone ?? "").trim() || null,
    passwordHash
  });

  return { user, token: await issueToken(user.id) };
}

export async function login({ email, password } = {}) {
  const cleanEmail = String(email ?? "").trim();

  if (!cleanEmail || !password) throw httpError(400, "Correo y contraseña son obligatorios");

  const account = await usersRepository.findUserByEmail(normalizeEmail(cleanEmail));
  if (!account) throw httpError(401, "Credenciales inválidas");

  const matches = await bcrypt.compare(String(password), account.passwordHash);
  if (!matches) throw httpError(401, "Credenciales inválidas");

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone
  };

  return { user, token: await issueToken(user.id) };
}

export async function updateProfile(userId, { name, phone } = {}) {
  const current = await usersRepository.findUserById(userId);
  if (!current) throw httpError(401, "No autorizado");

  const nextName = name === undefined ? current.name : String(name).trim();
  if (!nextName) throw httpError(400, "El nombre es obligatorio");

  const nextPhone = phone === undefined ? current.phone : String(phone).trim() || null;

  return usersRepository.updateUser(userId, { name: nextName, phone: nextPhone });
}

export function resolveToken(token) {
  return token ? sessionsRepository.findUserByToken(token) : Promise.resolve(null);
}
