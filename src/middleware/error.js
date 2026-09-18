export function notFound(req, res) {
  res.status(404).json({ message: "Recurso no encontrado" });
}

export function errorHandler(err, req, res, _next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido en el cuerpo de la solicitud" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "El cuerpo de la solicitud es demasiado grande" });
  }

  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ message: "Error interno del servidor" });
  }

  return res.status(status).json({ message: err.message });
}
