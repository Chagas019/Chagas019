// Função serverless da Vercel: reaproveita a instância Fastify entre invocações.
import { createJarvisApp } from "../dist/bootstrap.js";

let ready;
export default async function handler(req, res) {
  ready ??= createJarvisApp(process.env).then(async (app) => { await app.ready(); return app; });
  const app = await ready;
  app.server.emit("request", req, res);
}
