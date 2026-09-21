import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";
import * as sessionsRepository from "../repositories/sessions.repository.js";
import * as usersRepository from "../repositories/users.repository.js";
import { httpError } from "../utils/httpError.js";
import { LIMITS, optionalText, requireText } from "../utils/validation.js";

const BCRYPT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => email.toLowerCase();

const parseEmail = (value) => {
  const email = requireText(value, "El correo", LIMITS.userEmail);

  if (!EMAIL_PATTERN.test(email)) throw httpError(400, "El correo no es válido");

  return normalizeEmail(email);
};

const parsePassword = (value) => {
  const password = String(value ?? "");

  if (password.length < LIMITS.passwordMin) {
    throw httpError(400, `La contraseña debe tener al menos ${LIMITS.passwordMin} caracteres`);
  }

  if (Buffer.byteLength(password, "utf8") > LIMITS.passwordMaxBytes) {
    throw httpError(400, `La contraseña no puede superar los ${LIMITS.passwordMaxBytes} caracteres`);
  }

  return password;
};

const issueToken = async (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * MS_PER_DAY);

  await sessionsRepository.createSession({ userId, token, expiresAt });

  return token;
};

export async function register(body = {}) {
  const name = requireText(body.name, "El nombre", LIMITS.userName);
  const email = parseEmail(body.email);
  const password = parsePassword(body.password);
  const phone = optionalText(body.phone, "El teléfono", LIMITS.userPhone);

  if (await usersRepository.findUserByEmail(email)) {
    throw httpError(409, "El correo ya está registrado");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;

  try {
    user = await usersRepository.createUser({ name, email, phone, passwordHash });
  } catch (error) {
    // The lookup above is only a fast path: a concurrent request can still win the race.
    if (error.code === "ER_DUP_ENTRY") throw httpError(409, "El correo ya está registrado");

    throw error;
  }

  return { user, token: await issueToken(user.id) };
}

export async function login(body = {}) {
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) throw httpError(400, "Correo y contraseña son obligatorios");

  const account = await usersRepository.findUserByEmail(normalizeEmail(email));
  if (!account) throw httpError(401, "Credenciales inválidas");

  const matches = await bcrypt.compare(password, account.passwordHash);
  if (!matches) throw httpError(401, "Credenciales inválidas");

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone
  };

  return { user, token: await issueToken(user.id) };
}

export async function updateProfile(userId, body = {}) {
  const current = await usersRepository.findUserById(userId);
  if (!current) throw httpError(401, "No autorizado");

  const name = body.name === undefined
    ? current.name
    : requireText(body.name, "El nombre", LIMITS.userName);

  const phone = body.phone === undefined
    ? current.phone
    : optionalText(body.phone, "El teléfono", LIMITS.userPhone);

  return usersRepository.updateUser(userId, { name, phone });
}

export function resolveToken(token) {
  return token ? sessionsRepository.findUserByToken(token) : Promise.resolve(null);
}
