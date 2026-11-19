import { Queue, Worker, type Job } from "bullmq";
import { env } from "../config/env";
import { prisma, redis, logEvent, errMsg, logger } from "../lib/core";
import { kv, redisEnabled } from "../lib/kv";
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
 * Sem REDIS_URL (modo serverless), as mesmas etapas rodam em runCronCycle(), acionado por um
 * agendador externo (pg_cron → POST /api/cron/run) a cada poucos minutos.
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

/** Modo serverless: gera copies em linha (limitado por chamada para caber no tempo da função). */
async function generateCopiesInline(limit: number): Promise<number> {
  const approved = await prisma.product.findMany({ where: { state: "APPROVED" }, select: { id: true }, orderBy: { priority: "desc" }, take: limit });
  for (const p of approved) {
    try {
      await generateCopy(p.id);
    } catch (err) {
      if (err instanceof SystemHaltedError) break;
      await logEvent("error", "orchestrator", `copy falhou (${p.id}): ${errMsg(err)}`);
    }
  }
  return approved.length;
}

export async function enqueueCopies(): Promise<number> {
  if (!redisEnabled()) return generateCopiesInline(15);
  const approved = await prisma.product.findMany({ where: { state: "APPROVED" }, select: { id: true }, orderBy: { priority: "desc" }, take: 200 });
  const { copyQueue } = queues();
  for (const p of approved) {
    await copyQueue.add("copy", { productId: p.id }, { jobId: `copy-${p.id}-${Math.floor(Date.now() / 600_000)}`, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 500, removeOnFail: 500 });
  }
  return approved.length;
}

export async function triggerScout(trigger: string) {
  if (!redisEnabled()) return handleScout(trigger);
  const { orchQueue } = queues();
  await orchQueue.add("scout-cycle", { trigger }, { jobId: `scout-${trigger}`, removeOnComplete: 100, removeOnFail: 100 });
}

/** Reconfigura os jobs repetíveis conforme as configurações atuais. */
export async function scheduleRepeatables() {
  if (!redisEnabled()) return; // modo agendado: o ritmo é dado por runCronCycle()
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
  await kv().set(LAST_SCOUT_KEY, String(Date.now()));
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
  const last = Number((await kv().get(LAST_SCOUT_KEY)) ?? 0);
  if (remaining > 0 && ready < remaining && Date.now() - last > 30 * 60_000) {
    await logEvent("info", "orchestrator", `estoque baixo (${ready} prontos para ${remaining} restantes): antecipando pesquisa`);
    await triggerScout(`supply-${Date.now()}`);
  }
}

/** Recupera tarefas travadas e reenvia aprovados sem copy. */
export async function recovery() {
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
  if (redisEnabled()) {
    const { orchQueue, copyQueue } = queues();
    await orchQueue.pause();
    await copyQueue.pause();
  }
  for (const k of ["SCOUT", "COPYWRITER", "DISTRIBUTOR", "ORCHESTRATOR"] as const) await setAgentStatus(k, "STOPPED", null);
  await logEvent("warn", "orchestrator", `STOP ALL acionado por ${by}`);
}

export async function resumeAll(by: string) {
  await updateSettings({ systemHalted: false }, by);
  if (redisEnabled()) {
    const { orchQueue, copyQueue } = queues();
    await orchQueue.resume();
    await copyQueue.resume();
  }
  for (const k of ["SCOUT", "COPYWRITER", "DISTRIBUTOR", "ORCHESTRATOR"] as const) await setAgentStatus(k, "IDLE", null);
  await logEvent("info", "orchestrator", `sistema retomado por ${by}`);
}

export async function queueStats() {
  if (!redisEnabled()) {
    const empty = { active: 0, waiting: 0, delayed: 0, failed: 0 };
    const [ready, approved, lastRun] = await Promise.all([
      prisma.product.count({ where: { state: "READY_TO_PUBLISH" } }),
      prisma.product.count({ where: { state: "APPROVED" } }),
      kv().get(LAST_CRON_KEY),
    ]);
    return {
      mode: "cron",
      orchestrator: { ...empty, waiting: ready },
      copywriter: { ...empty, waiting: approved },
      orchestratorPaused: false,
      copywriterPaused: false,
      lastCronRun: lastRun ? new Date(Number(lastRun)).toISOString() : null,
      localMinutes: localMinutes(),
    };
  }
  const { orchQueue, copyQueue } = queues();
  const [o, c] = await Promise.all([orchQueue.getJobCounts(), copyQueue.getJobCounts()]);
  return { orchestrator: o, copywriter: c, orchestratorPaused: await orchQueue.isPaused(), copywriterPaused: await copyQueue.isPaused(), localMinutes: localMinutes() };
}

const LAST_CRON_KEY = "oferta:orch:lastCron";
const CLOSED_KEY = (d: string) => `oferta:orch:closed:${d}`;

/**
 * Modo serverless: um ciclo completo do Orchestrator, chamado periodicamente pelo agendador.
 * Executa (na ordem) pesquisa quando devida, copies pendentes, recuperação, publicação e fechamento do dia.
 * Protegido por lock para nunca rodar em paralelo.
 */
export async function runCronCycle(): Promise<Record<string, unknown>> {
  const s = await getSettings();
  if (s.systemHalted) return { skipped: "STOP ALL" };
  if (!(await kv().setNx("oferta:orch:cronLock", "1", 280_000))) return { skipped: "ciclo anterior ainda em execução" };
  const out: Record<string, unknown> = {};
  try {
    await setAgentStatus("ORCHESTRATOR", "RUNNING", "ciclo agendado");
    const last = Number((await kv().get(LAST_SCOUT_KEY)) ?? 0);
    if (Date.now() - last >= s.researchIntervalMinutes * 60_000) {
      await kv().set(LAST_SCOUT_KEY, String(Date.now()));
      await handleScout("cron");
      out.scout = "executado";
    } else {
      await supplyCheck();
    }
    out.copies = await generateCopiesInline(15);
    await recovery();
    out.distributor = await distributorTick();
    if (localMinutes() >= 23 * 60 + 55) {
      const d = localDate();
      if (!(await kv().get(CLOSED_KEY(d)))) {
        await dailyClose(d);
        await kv().set(CLOSED_KEY(d), "1");
        out.dailyClose = d;
      }
    }
    await kv().set(LAST_CRON_KEY, String(Date.now()));
    await setAgentStatus("ORCHESTRATOR", "IDLE", null, null);
    return out;
  } catch (err) {
    if (err instanceof SystemHaltedError) return { skipped: "STOP ALL" };
    await setAgentStatus("ORCHESTRATOR", "ERROR", null, errMsg(err));
    await logEvent("error", "orchestrator", `ciclo agendado falhou: ${errMsg(err)}`);
    throw err;
  } finally {
    await kv().del("oferta:orch:cronLock");
  }
}
