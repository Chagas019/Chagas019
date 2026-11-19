import { Queue, Worker, type Job } from "bullmq";
import { env } from "../config/env";
import { prisma, redis, logEvent, errMsg, logger } from "../lib/core";
import { getSettings, updateSettings } from "../lib/settings";
import { ensureToday } from "../lib/metrics";
import { localDate, localMinutes, startOfLocalDay } from "../lib/time";
import { runScoutCycle } from "../agents/scout/scout";
import { generateCopy } from "../agents/copywriter/copywriter";
import { distributorTick } from "../agents/distributor/distributor";
import { setAgentStatus, SystemHaltedError } from "../agents/runtime";
import { transition } from "./states";

/**
 * ORCHESTRATOR — coordena os três agentes. Fluxo:
 *   Scout → Validação (score/filtros) → Copywriter → Validação final → Distributor
 * Filas BullMQ:
 *   - "oferta-orchestrator": scout-cycle, distributor-tick, supply-check, recovery, daily-close (repetíveis)
 *   - "oferta-copywriter":   uma tarefa por produto aprovado (jobId = copy:<id> evita duplicidade)
 */
export const ORCH_QUEUE = "oferta-orchestrator";
export const COPY_QUEUE = "oferta-copywriter";
const LAST_SCOUT_KEY = "oferta:orch:lastScout";

const connection = () => ({ connection: redis() });

let orchQueue: Queue | null = null;
let copyQueue: Queue | null = null;
export const queues = () => {
  orchQueue ??= new Queue(ORCH_QUEUE, connection());
  copyQueue ??= new Queue(COPY_QUEUE, connection());
  return { orchQueue, copyQueue };
};

export async function enqueueCopies(): Promise<number> {
  const approved = await prisma.product.findMany({ where: { state: "APPROVED" }, select: { id: true }, orderBy: { priority: "desc" }, take: 200 });
  const { copyQueue } = queues();
  for (const p of approved) {
    await copyQueue.add("copy", { productId: p.id }, { jobId: `copy-${p.id}-${Math.floor(Date.now() / 600_000)}`, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 500, removeOnFail: 500 });
  }
  return approved.length;
}

export async function triggerScout(trigger: string) {
  const { orchQueue } = queues();
  await orchQueue.add("scout-cycle", { trigger }, { jobId: `scout-${trigger}`, removeOnComplete: 100, removeOnFail: 100 });
}

/** Reconfigura os jobs repetíveis conforme as configurações atuais. */
export async function scheduleRepeatables() {
  const s = await getSettings();
  const { orchQueue } = queues();
  const opts = { removeOnComplete: 200, removeOnFail: 200 };
  // Job Schedulers (BullMQ 6): upsert é idempotente — reexecutar apenas atualiza a agenda
  await orchQueue.upsertJobScheduler("scout-cycle", { every: s.researchIntervalMinutes * 60_000, immediately: true }, { name: "scout-cycle", data: { trigger: "schedule" }, opts });
  await orchQueue.upsertJobScheduler("distributor-tick", { every: 60_000 }, { name: "distributor-tick", data: {}, opts });
  await orchQueue.upsertJobScheduler("supply-check", { every: 30 * 60_000 }, { name: "supply-check", data: {}, opts });
  await orchQueue.upsertJobScheduler("recovery", { every: 10 * 60_000 }, { name: "recovery", data: {}, opts });
  await orchQueue.upsertJobScheduler("daily-close", { pattern: "55 23 * * *", tz: env.TZ_APP }, { name: "daily-close", data: {}, opts });
}

async function handleScout(trigger: string) {
  const r = await runScoutCycle(`${trigger}:${Date.now()}`);
  await redis().set(LAST_SCOUT_KEY, String(Date.now()));
  const n = await enqueueCopies();
  await logEvent("info", "orchestrator", `scout finalizado; ${n} produtos aprovados enviados ao Copywriter`, { approved: r?.approved.length ?? 0 });
}

/** Garante oferta suficiente para a meta: se o estoque de prontos é baixo, antecipa uma pesquisa. */
async function supplyCheck() {
  const s = await getSettings();
  const since = startOfLocalDay();
  const [ready, published] = await Promise.all([
    prisma.product.count({ where: { state: { in: ["READY_TO_PUBLISH", "APPROVED", "COPY_GENERATED"] } } }),
    prisma.publication.count({ where: { sentAt: { gte: since }, status: { in: ["SENT", "DRY_RUN", "MANUAL_CONFIRMED"] } } }),
  ]);
  const remaining = s.dailyGoal - published;
  const last = Number((await redis().get(LAST_SCOUT_KEY)) ?? 0);
  if (remaining > 0 && ready < remaining && Date.now() - last > 30 * 60_000) {
    await logEvent("info", "orchestrator", `estoque baixo (${ready} prontos para ${remaining} restantes): antecipando pesquisa`);
    await triggerScout(`supply-${Date.now()}`);
  }
}

/** Recupera tarefas travadas e reenvia aprovados sem copy. */
async function recovery() {
  const stale = new Date(Date.now() - 15 * 60_000);
  const stuck = await prisma.product.findMany({ where: { state: "PUBLISHING", updatedAt: { lt: stale } }, select: { id: true } });
  for (const p of stuck) {
    const pending = await prisma.publication.findFirst({ where: { productId: p.id, status: "MANUAL_PENDING" } });
    if (pending) continue; // aguardando operador
    await transition(p.id, "PUBLISHING", "READY_TO_PUBLISH", "orchestrator", "recuperado de publicação travada");
  }
  const stuckResearch = await prisma.product.findMany({ where: { state: "RESEARCHING", updatedAt: { lt: stale } }, select: { id: true } });
  for (const p of stuckResearch) await transition(p.id, "RESEARCHING", "FAILED", "orchestrator", "pesquisa interrompida", { lastError: "pesquisa interrompida" });
  await enqueueCopies();
}

/** Fecha o dia: registra se a meta foi atingida (sem inventar ofertas para completar). */
export async function dailyClose(date = localDate()) {
  const m = await ensureToday(date);
  const total = m.published + m.dryRunPublished;
  const reached = total >= m.goal;
  const note = reached
    ? `meta atingida: ${total}/${m.goal}`
    : `meta não atingida: ${total}/${m.goal} — apenas ofertas que atenderam aos critérios de qualidade foram publicadas`;
  await prisma.dailyMetrics.update({ where: { date }, data: { goalReached: reached, goalNote: note } });
  await logEvent(reached ? "info" : "warn", "orchestrator", note, { date });
}

async function orchestratorProcessor(job: Job) {
  const s = await getSettings();
  if (s.systemHalted) return { skipped: "STOP ALL" };
  try {
    switch (job.name) {
      case "scout-cycle":
        return await handleScout(job.data.trigger ?? "manual");
      case "distributor-tick": {
        const r = await distributorTick();
        if (r.action === "blocked" || r.action === "failed") {
          await setAgentStatus("DISTRIBUTOR", r.action === "failed" ? "ERROR" : "PAUSED", r.reason ?? null);
        } else if (r.action === "waiting" || r.action === "idle") {
          await setAgentStatus("DISTRIBUTOR", "IDLE", r.reason ?? null);
        }
        if (r.action === "requeued") await enqueueCopies();
        return r;
      }
      case "supply-check":
        return await supplyCheck();
      case "recovery":
        return await recovery();
      case "daily-close":
        return await dailyClose();
    }
  } catch (err) {
    if (err instanceof SystemHaltedError) return { skipped: "STOP ALL" };
    await logEvent("error", "orchestrator", `job ${job.name} falhou: ${errMsg(err)}`);
    throw err;
  }
}

async function copyProcessor(job: Job<{ productId: string }>) {
  const s = await getSettings();
  if (s.systemHalted) return { skipped: "STOP ALL" };
  return generateCopy(job.data.productId);
}

export function startWorkers() {
  const w1 = new Worker(ORCH_QUEUE, orchestratorProcessor, { ...connection(), concurrency: 1 });
  const w2 = new Worker(COPY_QUEUE, copyProcessor, { ...connection(), concurrency: 3 });
  for (const w of [w1, w2]) w.on("failed", (job, err) => logger.warn({ job: job?.name, err: err.message }, "job falhou"));
  return [w1, w2];
}

/** STOP ALL: interrompe todos os agentes imediatamente. */
export async function stopAll(by: string) {
  await updateSettings({ systemHalted: true }, by);
  const { orchQueue, copyQueue } = queues();
  await orchQueue.pause();
  await copyQueue.pause();
  for (const k of ["SCOUT", "COPYWRITER", "DISTRIBUTOR", "ORCHESTRATOR"] as const) await setAgentStatus(k, "STOPPED", null);
  await logEvent("warn", "orchestrator", `STOP ALL acionado por ${by}`);
}

export async function resumeAll(by: string) {
  await updateSettings({ systemHalted: false }, by);
  const { orchQueue, copyQueue } = queues();
  await orchQueue.resume();
  await copyQueue.resume();
  for (const k of ["SCOUT", "COPYWRITER", "DISTRIBUTOR", "ORCHESTRATOR"] as const) await setAgentStatus(k, "IDLE", null);
  await logEvent("info", "orchestrator", `sistema retomado por ${by}`);
}

export async function queueStats() {
  const { orchQueue, copyQueue } = queues();
  const [o, c] = await Promise.all([orchQueue.getJobCounts(), copyQueue.getJobCounts()]);
  return { orchestrator: o, copywriter: c, orchestratorPaused: await orchQueue.isPaused(), copywriterPaused: await copyQueue.isPaused(), localMinutes: localMinutes() };
}
