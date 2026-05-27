import { env } from "./config/env.js";
import { buildApp } from "./app.js";

const app = await buildApp();

await app.listen({
  port: process.env.API_PORT ? env.API_PORT : env.PORT,
  host: "0.0.0.0"
});
