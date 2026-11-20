import { createJarvisApp } from "./bootstrap.js";
import { loadConfig } from "./server/config.js";

const app = await createJarvisApp(process.env);
await app.listen({ port: loadConfig(process.env).port, host: "0.0.0.0" });
