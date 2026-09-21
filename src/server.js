import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { closePool, ping } from "./db/pool.js";

const FORCE_EXIT_MS = 10000;

const app = createApp();

const databaseIsUp = await ping();

if (!databaseIsUp) {
  console.warn(
    `No se pudo conectar a la base "${config.db.database}" en ${config.db.host}:${config.db.port} como "${config.db.user}".\n` +
      "  ¿Arrancaste MySQL en el panel de XAMPP?\n" +
      "  GET /api/health responderá 503 (db: down) hasta que la conexión funcione."
  );
}

const server = app.listen(config.port, config.host, () => {
  console.log(`El Shampan API listening on http://${config.host}:${config.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `El puerto ${config.port} ya está en uso. Cierra el proceso que lo ocupa o cambia PORT en el .env.`
    );
  } else {
    console.error("El servidor no pudo arrancar", error);
  }

  process.exit(1);
});

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;

  shuttingDown = true;
  console.log(`Recibido ${signal}, cerrando el servidor...`);

  const forceExit = setTimeout(() => {
    console.error("El cierre tardó demasiado, forzando la salida.");
    process.exit(1);
  }, FORCE_EXIT_MS);

  forceExit.unref();

  server.close(async () => {
    try {
      await closePool();
    } catch (error) {
      console.error("No se pudo cerrar el pool de conexiones", error);
    }

    clearTimeout(forceExit);
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin manejar", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada", error);
  process.exit(1);
});
