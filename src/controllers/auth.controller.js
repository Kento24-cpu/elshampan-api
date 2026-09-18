import bcrypt from "bcryptjs";
import { signToken } from "../services/tokens.service.js";
import {
  createUser,
  findUserWithPasswordByEmail,
  updateUser
} from "../services/users.service.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import { serializeUser } from "../utils/serializers.js";
import {
  optionalString,
  requireEmail,
  requireString
} from "../utils/validate.js";

const BCRYPT_ROUNDS = 10;

export async function register(req, res) {
  const name = requireString(req.body.name, "nombre", { max: 120 });
  const email = requireEmail(req.body.email);
  const password = requireString(req.body.password, "contraseña", {
    min: 8,
    max: 72
  });
  const phone = optionalString(req.body.phone, "teléfono", { max: 30 });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await createUser({ name, email, passwordHash, phone });

  res.status(201).json({ token: signToken(user), user });
}

export async function login(req, res) {
  const email = requireEmail(req.body.email);
  const password = requireString(req.body.password, "contraseña", {
    min: 1,
    max: 72
  });

  const found = await findUserWithPasswordByEmail(email);
  const passwordMatches = found
    ? await bcrypt.compare(password, found.password_hash)
    : false;

  if (!passwordMatches) {
    throw unauthorized("Credenciales inválidas");
  }

  const user = serializeUser(found);

  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  res.json(req.user);
}

export async function updateMe(req, res) {
  const name =
    req.body.name === undefined
      ? null
      : requireString(req.body.name, "nombre", { max: 120 });
  const phone = optionalString(req.body.phone, "teléfono", { max: 30 });

  if (name === null && phone === null) {
    throw badRequest("No hay datos para actualizar");
  }

  const user = await updateUser(req.user.id, { name, phone });

  res.json(user);
}
