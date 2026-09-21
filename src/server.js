import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { closePool } from "./db/pool.js";

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`El Shampan API listening on http://${config.host}:${config.port}`);
});

const shutdown = () => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
