import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
