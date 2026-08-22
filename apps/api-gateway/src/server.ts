import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";

app.get("/", async () => {
  return { message: "Hydra API is alive" };
});

const start = async () => {
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info({ port: env.port, host: env.host }, "Hydra API started");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
