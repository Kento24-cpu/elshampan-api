import bcrypt from "bcryptjs";
import { createUser } from "../services/users.service.js";
import { requireEmail, requireString, optionalString } from "../utils/validate.js";

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

  res.status(201).json({ user });
}
