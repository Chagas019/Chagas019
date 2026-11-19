/**
 * Entrada para a Vercel (função serverless). Todo o tráfego é reescrito para cá (vercel.json).
 * Sem REDIS_URL a plataforma roda em modo agendado: o pg_cron chama POST /api/cron/run.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app";
import { ensureBootstrap } from "../src/bootstrap";

const app = createApp();
let boot: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  boot ??= ensureBootstrap().catch((err) => {
    boot = null;
    throw err;
  });
  await boot;
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
