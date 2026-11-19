import { Prisma } from "@prisma/client";
import { prisma } from "./core";
import { localDate } from "./time";
import { getSettings } from "./settings";

type Counter = "researched" | "approved" | "rejected" | "copiesGenerated" | "published" | "dryRunPublished" | "failed" | "clicks";

export async function ensureToday(date = localDate()) {
  const existing = await prisma.dailyMetrics.findUnique({ where: { date } });
  if (existing) return existing;
  const s = await getSettings();
  try {
    return await prisma.dailyMetrics.create({ data: { date, goal: s.dailyGoal } });
  } catch (err) {
    // corrida entre processos (API e worker): outro já criou o registro
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.dailyMetrics.findUniqueOrThrow({ where: { date } });
    }
    throw err;
  }
}

export async function incr(field: Counter, by = 1, date = localDate()) {
  if (by === 0) return;
  await ensureToday(date);
  await prisma.dailyMetrics.update({ where: { date }, data: { [field]: { increment: by } } });
}

export async function addEstimatedCommission(value: number, date = localDate()) {
  if (!value) return;
  await ensureToday(date);
  await prisma.dailyMetrics.update({ where: { date }, data: { estimatedCommission: { increment: new Prisma.Decimal(value.toFixed(2)) } } });
}
