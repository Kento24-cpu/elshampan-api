import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`El Shampan API listening on http://${config.host}:${config.port}`);
});
