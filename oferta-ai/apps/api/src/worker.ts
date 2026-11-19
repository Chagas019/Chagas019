import { env } from "./config/env";
import { logger, prisma, logEvent } from "./lib/core";
import { ensureBootstrap } from "./bootstrap";
import { scheduleRepeatables, startWorkers } from "./orchestrator/orchestrator";
import { getSettings } from "./lib/settings";

/** Processo de agentes: Orchestrator + filas BullMQ (Scout, Copywriter, Distributor). */
async function main() {
  await ensureBootstrap();
  await scheduleRepeatables();
  const workers = startWorkers();
  const s = await getSettings();
  await logEvent("info", "orchestrator", `workers iniciados (modo ${env.DATA_MODE}, meta ${s.dailyGoal}/dia, STOP ALL=${s.systemHalted})`);
  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
main().catch((err) => {
  logger.fatal({ err }, "falha ao iniciar workers");
  process.exit(1);
});
