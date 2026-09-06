import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";

app.get("/", async () => {
  return { message: "Koryn Security Platform API is alive", brand: "HOJO" };
});

const start = async () => {
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info({ port: env.port, host: env.host }, "Koryn Security Platform API started");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
