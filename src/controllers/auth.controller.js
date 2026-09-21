import * as authService from "../services/auth.service.js";

export async function register(req, res) {
  const session = await authService.register(req.body);

  res.status(201).json(session);
}

export async function login(req, res) {
  res.json(await authService.login(req.body));
}

export function me(req, res) {
  res.json(req.user);
}

export async function updateMe(req, res) {
  res.json(await authService.updateProfile(req.user.id, req.body));
}
