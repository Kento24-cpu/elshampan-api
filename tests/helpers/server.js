import { createApp } from "../../src/app.js";

// The configured auth rate limit (20 per 15 minutes) would trip the suite, so tests
// get a wide default and the ones that exercise the limit pass their own.
const DEFAULT_AUTH_RATE_LIMIT = { windowMs: 60_000, limit: 10_000 };

export async function startTestServer(options = {}) {
  const app = createApp({ authRateLimit: DEFAULT_AUTH_RATE_LIMIT, ...options });
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
