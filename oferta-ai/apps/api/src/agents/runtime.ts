import { AgentKind, AgentStatus, Prisma } from "@prisma/client";
import { prisma, logEvent, errMsg } from "../lib/core";
import { getSettings } from "../lib/settings";

export class SystemHaltedError extends Error {
  constructor() {
    super("Sistema interrompido (STOP ALL ativo)");
  }
}

export async function agentId(kind: AgentKind): Promise<string> {
  const a = await prisma.agent.findUnique({ where: { kind } });
  if (!a) throw new Error(`Agente ${kind} não registrado (rode o seed)`);
  return a.id;
}

export async function setAgentStatus(kind: AgentKind, status: AgentStatus, currentTask: string | null = null, lastError?: string | null) {
  await prisma.agent.update({
    where: { kind },
    data: { status, currentTask, ...(lastError !== undefined ? { lastError } : {}), ...(status === "RUNNING" ? { lastRunAt: new Date() } : {}) },
  });
}

/**
 * Envolve uma tarefa de agente: registra AgentExecution, status do agente,
 * respeita STOP ALL e mede duração. Idempotência opcional via taskKey.
 */
export async function runAgentTask<T>(
  kind: AgentKind,
  task: string,
  input: Record<string, unknown>,
  fn: (exec: { id: string }) => Promise<{ output: T; model?: string; status?: "SUCCESS" | "SKIPPED" }>,
  opts: { taskKey?: string } = {},
): Promise<T | null> {
  const settings = await getSettings();
  if (settings.systemHalted) throw new SystemHaltedError();

  if (opts.taskKey) {
    const dup = await prisma.agentExecution.findFirst({ where: { taskKey: opts.taskKey, status: { in: ["RUNNING", "SUCCESS"] } } });
    if (dup) {
      await logEvent("debug", kind.toLowerCase(), `tarefa duplicada ignorada: ${opts.taskKey}`);
      return null;
    }
  }

  const id = await agentId(kind);
  const exec = await prisma.agentExecution.create({
    data: { agentId: id, task, taskKey: opts.taskKey, input: input as Prisma.InputJsonValue },
  });
  await setAgentStatus(kind, "RUNNING", task);
  const started = Date.now();
  try {
    const r = await fn({ id: exec.id });
    await prisma.agentExecution.update({
      where: { id: exec.id },
      data: {
        status: r.status ?? "SUCCESS",
        output: (r.output ?? null) as Prisma.InputJsonValue,
        model: r.model,
        durationMs: Date.now() - started,
        finishedAt: new Date(),
      },
    });
    await setAgentStatus(kind, "IDLE", null, null);
    return r.output;
  } catch (err) {
    const msg = errMsg(err);
    await prisma.agentExecution.update({
      where: { id: exec.id },
      data: { status: "FAILED", error: msg, durationMs: Date.now() - started, finishedAt: new Date() },
    });
    await setAgentStatus(kind, err instanceof SystemHaltedError ? "STOPPED" : "ERROR", null, msg);
    await logEvent("error", kind.toLowerCase(), `falha em ${task}: ${msg}`);
    throw err;
  }
}
