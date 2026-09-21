import * as ordersService from "../services/orders.service.js";

export async function createOrder(req, res) {
  res.status(201).json(await ordersService.createOrder(req.user?.id, req.body));
}

export async function listOrders(req, res) {
  res.json(await ordersService.listOrders(req.user.id));
}

export async function getOrder(req, res) {
  res.json(await ordersService.getOrder(req.user.id, req.params.id));
}
