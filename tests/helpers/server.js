import { createApp } from "../../src/app.js";
import { closePool } from "../../src/db/pool.js";

export async function startTestServer() {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  await new Promise((resolve) => server.once("listening", resolve));

  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

export async function stopTestServer(server) {
  await server.close();
  await closePool();
}
