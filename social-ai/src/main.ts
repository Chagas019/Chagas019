import { loadEnv } from './config/env.js';
import { getDb } from './db/db.js';
import { ensureBootstrapAdmin } from './security/auth.js';
import { buildServer } from './api/server.js';
import { Worker } from './orchestrator/worker.js';
import { Scheduler } from './orchestrator/scheduler.js';
import { checkIntegrations } from './integrations/health.js';
import { logger } from './lib/logger.js';

const e = loadEnv();
getDb();
ensureBootstrapAdmin(e.ADMIN_EMAIL, e.ADMIN_PASSWORD);

const app = await buildServer();
await app.listen({ port: e.PORT, host: e.HOST });
logger.info(`SOCIAL AI ouvindo em http://${e.HOST}:${e.PORT}`, { env: e.NODE_ENV, allowPublishing: e.ALLOW_PUBLISHING });

const worker = new Worker();
const scheduler = new Scheduler();
if (e.WORKER_ENABLED) worker.start();
if (e.SCHEDULER_ENABLED) scheduler.start();
checkIntegrations().catch((err) => logger.warn(`Checagem de integrações falhou: ${err.message}`));

const shutdown = async (sig: string) => {
  logger.info(`Encerrando (${sig})`);
  scheduler.stop();
  await worker.stop();
  await app.close();
  getDb().close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
