import { verifyToken } from "../services/tokens.service.js";
import { findUserById } from "../services/users.service.js";
import { unauthorized } from "../utils/errors.js";

const readToken = (req) => {
  const header = req.headers.authorization ?? "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
};

async function resolveUser(token) {
  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized("Tu sesión venció, vuelve a iniciar sesión");
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw unauthorized("Tu sesión ya no es válida");
  }

  return user;
}

export async function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    throw unauthorized("Inicia sesión para continuar");
  }

  req.user = await resolveUser(token);
  next();
}

export async function optionalAuth(req, res, next) {
  const token = readToken(req);

  if (token) {
    req.user = await resolveUser(token);
  }

  next();
}
