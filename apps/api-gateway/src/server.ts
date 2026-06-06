import "dotenv/config";
import { app } from "./app.js";

app.get("/", async () => {
  return { message: "Hydra API is alive" };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Hydra API running on http://localhost:3000");
    console.log("Swagger docs on http://localhost:3000/docs");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();