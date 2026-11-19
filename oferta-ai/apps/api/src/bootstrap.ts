import { prisma, logger } from "./lib/core";
import { env } from "./config/env";
import { hashPassword } from "./auth/auth";
import { ensureToday } from "./lib/metrics";
import { SCOUT_IDENTITY, SCOUT_SYSTEM_PROMPT } from "./agents/scout/scout";
import { COPY_IDENTITY, COPY_SYSTEM_PROMPT } from "./agents/copywriter/copywriter";
import { DIST_IDENTITY, DIST_SYSTEM_PROMPT } from "./agents/distributor/distributor";

const AGENTS = [
  { kind: "SCOUT" as const, name: "Scout AI", identity: SCOUT_IDENTITY, systemPrompt: SCOUT_SYSTEM_PROMPT },
  { kind: "COPYWRITER" as const, name: "Copywriter AI", identity: COPY_IDENTITY, systemPrompt: COPY_SYSTEM_PROMPT },
  { kind: "DISTRIBUTOR" as const, name: "Distributor AI", identity: DIST_IDENTITY, systemPrompt: DIST_SYSTEM_PROMPT },
  { kind: "ORCHESTRATOR" as const, name: "Orchestrator", identity: "Coordena Scout → Validação → Copywriter → Validação final → Distributor.", systemPrompt: "Módulo determinístico de coordenação (filas, estados, retentativas, meta diária)." },
];

/** Idempotente: registra agentes, métricas do dia e o admin inicial (se definido no .env). */
export async function ensureBootstrap() {
  for (const a of AGENTS) {
    await prisma.agent.upsert({ where: { kind: a.kind }, create: a, update: { name: a.name, identity: a.identity, systemPrompt: a.systemPrompt } });
  }
  await ensureToday();
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const exists = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL.toLowerCase() } });
    if (!exists) {
      await prisma.user.create({ data: { email: env.ADMIN_EMAIL.toLowerCase(), name: env.ADMIN_NAME, role: "ADMIN", passwordHash: await hashPassword(env.ADMIN_PASSWORD) } });
      logger.info(`usuário administrador criado: ${env.ADMIN_EMAIL}`);
    }
  }
}
