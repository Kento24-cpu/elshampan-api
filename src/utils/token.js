import crypto from "node:crypto";

const TOKEN_BYTES = 32;

export function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

// Only the hash is stored, so a database dump cannot be replayed as a live session.
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
