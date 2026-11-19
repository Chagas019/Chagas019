import { env } from "./config/env";
import { createApp } from "./app";
import { logger, prisma } from "./lib/core";
import { ensureBootstrap } from "./bootstrap";

async function main() {
  await ensureBootstrap();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`OFERTA AI API ouvindo na porta ${env.PORT} (modo ${env.DATA_MODE})`));
  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
main().catch((err) => {
  logger.fatal({ err }, "falha ao iniciar API");
  process.exit(1);
});
