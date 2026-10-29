// Inicialização: abre o banco, aplica migrações, faz o seed idempotente e recupera estados.
import { openDb } from './db.js';
import { getConfig } from './config.js';
import { seed } from './seed.js';
import { recoverOnBoot } from './engine.js';
import { anthropicProvider } from './providers/index.js';
import { createWorker, createScheduler } from './scheduler.js';

export function createApp({ env = process.env, config = getConfig(env), provider, fetchImpl } = {}) {
  const db = openDb(config.dbFile);
  const seeded = seed(db, config);
  const recovered = recoverOnBoot(db);
  const ctx = { db, config, env, provider: provider === undefined ? anthropicProvider(env) : provider, fetchImpl: fetchImpl || fetch };
  ctx.worker = createWorker(ctx);
  ctx.scheduler = createScheduler(ctx);
  ctx.boot = { seeded, recovered };
  return ctx;
}
