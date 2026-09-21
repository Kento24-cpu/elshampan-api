export function notFound(req, res) {
  res.status(404).json({ message: "Recurso no encontrado" });
}

// mysql2 reports failures through `code` / `errno`, never through `status`,
// so without this mapping every database error would surface as a 500.
const DATABASE_ERRORS = new Map([
  [1062, { status: 409, message: "El recurso ya existe" }],
  [1406, { status: 400, message: "Alguno de los datos enviados es demasiado largo" }],
  [1264, { status: 400, message: "Alguno de los valores enviados está fuera de rango" }],
  [1452, { status: 400, message: "Alguno de los datos enviados no es válido" }],
  [1451, { status: 409, message: "No se puede completar la operación: el registro está en uso" }],
  [1213, { status: 409, message: "No se pudo completar la operación, intenta de nuevo" }],
  [1205, { status: 409, message: "No se pudo completar la operación, intenta de nuevo" }],
  [1045, { status: 503, message: "El servicio no está disponible en este momento" }]
]);

const OFFLINE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ER_CON_COUNT_ERROR",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"
]);

const mapDatabaseError = (error) => {
  if (OFFLINE_CODES.has(error.code)) {
    return { status: 503, message: "El servicio no está disponible en este momento" };
  }

  return DATABASE_ERRORS.get(error.errno) ?? null;
};

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido en el cuerpo de la solicitud" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "El cuerpo de la solicitud es demasiado grande" });
  }

  const explicitStatus = err.status ?? err.statusCode;

  if (explicitStatus) {
    if (explicitStatus >= 500) console.error(err);
    return res.status(explicitStatus).json({ message: err.message });
  }

  const databaseError = mapDatabaseError(err);

  if (databaseError) {
    if (databaseError.status >= 500) console.error(err);
    return res.status(databaseError.status).json({ message: databaseError.message });
  }

  console.error(err);
  return res.status(500).json({ message: "Error interno del servidor" });
}
