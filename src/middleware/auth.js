import { resolveToken } from "../services/auth.service.js";

const readBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

export async function optionalAuth(req, _res, next) {
  const token = readBearerToken(req);
  req.user = await resolveToken(token);
  req.sessionToken = req.user ? token : null;

  next();
}

export async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  const user = await resolveToken(token);

  if (!user) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }

  req.user = user;
  req.sessionToken = token;

  next();
}
