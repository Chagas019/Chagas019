import { Prisma } from "@prisma/client";
import { prisma, redis, logEvent, errMsg } from "../../lib/core";
import { getSettings, type Settings } from "../../lib/settings";
import { incr, addEstimatedCommission } from "../../lib/metrics";
import { localDate, localMinutes, startOfLocalDay } from "../../lib/time";
import { recordFailure, recordSuccess } from "../../lib/circuitBreaker";
import { env } from "../../config/env";
import { getOfferProvider } from "../../integrations/shopee";
import { runAgentTask } from "../runtime";
import { transition } from "../../orchestrator/states";
import { canPublishNow } from "./schedule";
import { channelReadiness, sendToChannel, ChannelError, type ChannelName } from "./channels";

export const DIST_IDENTITY = "Gerente de distribuição e publicação: envia ofertas aprovadas no horário certo, sem duplicidade.";
export const DIST_SYSTEM_PROMPT = "Agente determinístico (sem LLM): aplica regras de agenda, limite diário, prioridade, idempotência e circuit breaker.";

const LOCK_KEY = "oferta:distributor:lock";
const COUNTED: Array<"SENT" | "MANUAL_CONFIRMED" | "DRY_RUN" | "MANUAL_PENDING"> = ["SENT", "MANUAL_CONFIRMED", "DRY_RUN", "MANUAL_PENDING"];

/** Canal efetivo: no ambiente de testes SEMPRE dry_run (nunca envia mensagens reais). */
export function effectiveChannel(settings: Settings): ChannelName {
  if (env.DATA_MODE === "sandbox" || env.NODE_ENV === "test") return "dry_run";
  return settings.primaryChannel;
}

async function todayStats() {
  const since = startOfLocalDay();
  const pubs = await prisma.publication.findMany({
    where: { status: { in: COUNTED }, OR: [{ sentAt: { gte: since } }, { status: "MANUAL_PENDING", createdAt: { gte: since } }] },
    select: { sentAt: true, createdAt: true, product: { select: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
  const perCategory: Record<string, number> = {};
  for (const p of pubs) perCategory[p.product.category] = (perCategory[p.product.category] ?? 0) + 1;
  const last = pubs.map((p) => p.sentAt ?? p.createdAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { count: pubs.length, perCategory, last, lastCategory: pubs[0]?.product.category ?? null };
}

/** Seleciona a próxima oferta: maior prioridade, respeitando variedade de categorias. */
async function pickNext(settings: Settings, perCategory: Record<string, number>, lastCategory: string | null) {
  const candidates = await prisma.product.findMany({
    where: { state: "READY_TO_PUBLISH" },
    orderBy: [{ priority: "desc" }, { updatedAt: "asc" }],
    take: 50,
    include: { copies: { where: { valid: true }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const eligible = candidates.filter((c) => c.copies.length && (perCategory[c.category] ?? 0) < settings.maxPerCategoryPerDay);
  return eligible.find((c) => c.category !== lastCategory) ?? eligible[0] ?? null;
}

export interface TickResult {
  action: "published" | "manual_queued" | "waiting" | "idle" | "blocked" | "failed" | "requeued";
  reason?: string;
  productId?: string;
  publicationId?: string;
}

export async function distributorTick(): Promise<TickResult> {
  // lock distribuído: só um tick por vez
  const got = await redis().set(LOCK_KEY, "1", "PX", 55_000, "NX");
  if (!got) return { action: "waiting", reason: "outro tick em execução" };
  try {
    const settings = await getSettings();
    const stats = await todayStats();
    const decision = canPublishNow({
      now: new Date(),
      nowMin: localMinutes(),
      lastPublishedAt: stats.last,
      publishedToday: stats.count,
      settings,
    });
    if (!decision.ok) return { action: "waiting", reason: decision.reason };

    const channel = effectiveChannel(settings);
    if (channel === "whatsapp_cloud" || channel === "telegram") {
      if (!settings.autoPublish) return { action: "blocked", reason: "publicação automática desabilitada" };
      const rd = await channelReadiness(channel);
      if (!rd.ready) return { action: "blocked", reason: rd.reasons.join("; ") };
    }

    const next = await pickNext(settings, stats.perCategory, stats.lastCategory);
    if (!next) return { action: "idle", reason: "nenhuma oferta pronta para publicar" };

    return (
      (await runAgentTask("DISTRIBUTOR", "publicar oferta", { productId: next.id, channel }, async () => {
        return { output: await publishProduct(next.id, next.copies[0].id, channel, settings) };
      })) ?? { action: "idle" }
    );
  } finally {
    await redis().del(LOCK_KEY);
  }
}

/** Revalida preço/disponibilidade antes de publicar (somente com fonte real). */
async function prePublishCheck(productId: string, settings: Settings): Promise<{ ok: true } | { ok: false; reason: string; kind: "unavailable" | "drift" }> {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  if (p.source === "SANDBOX") return { ok: true };
  const provider = await getOfferProvider();
  const fresh = await provider.getOfferByItemId(p.externalId);
  if (!fresh || fresh.priceMin === null) return { ok: false, reason: "produto indisponível na revalidação", kind: "unavailable" };
  const old = Number(p.currentPrice);
  const drift = Math.abs(fresh.priceMin - old) / old * 100;
  if (drift > settings.maxPriceDriftPct) {
    await prisma.product.update({ where: { id: p.id }, data: { currentPrice: new Prisma.Decimal(fresh.priceMin.toFixed(2)) } });
    await prisma.productPrice.create({ data: { productId: p.id, price: new Prisma.Decimal(fresh.priceMin.toFixed(2)), discountRate: fresh.priceDiscountRate } });
    return { ok: false, reason: `preço mudou ${drift.toFixed(1)}% (R$ ${old} → R$ ${fresh.priceMin})`, kind: "drift" };
  }
  return { ok: true };
}

export async function publishProduct(productId: string, copyId: string, channel: ChannelName, settings: Settings): Promise<TickResult> {
  if (!(await transition(productId, "READY_TO_PUBLISH", "PUBLISHING", "distributor", channel))) {
    return { action: "waiting", reason: "produto já em publicação por outro processo" };
  }
  const date = localDate();
  const idempotencyKey = `${productId}:${channel}:${date}`;
  const copy = await prisma.generatedCopy.findUniqueOrThrow({ where: { id: copyId } });
  if (!copy.valid) {
    await transition(productId, "PUBLISHING", "REJECTED", "distributor", "copy sem validação");
    return { action: "failed", reason: "copy sem validação" };
  }

  let pub = await prisma.publication.findUnique({ where: { idempotencyKey } });
  if (pub && ["SENT", "DRY_RUN", "MANUAL_CONFIRMED", "MANUAL_PENDING"].includes(pub.status)) {
    await transition(productId, "PUBLISHING", "PUBLISHED", "distributor", "já publicado (idempotência)");
    return { action: "published", productId, publicationId: pub.id, reason: "idempotente" };
  }
  if (!pub) {
    pub = await prisma.publication.create({
      data: { productId, copyId, channel, idempotencyKey, status: "QUEUED", scheduledFor: new Date() },
    });
  } else {
    // reaproveita o registro (ex.: retentativa ou copy regenerada), sempre com a copy validada mais recente
    pub = await prisma.publication.update({ where: { id: pub.id }, data: { copyId, status: "QUEUED", error: null } });
  }

  // Revalidação de preço/disponibilidade
  try {
    const check = await prePublishCheck(productId, settings);
    if (!check.ok) {
      await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "warn", message: check.reason } });
      await prisma.publication.update({ where: { id: pub.id }, data: { status: "CANCELLED", error: check.reason } });
      if (check.kind === "drift") {
        await recordFailure("price_inconsistency", check.reason);
        await transition(productId, "PUBLISHING", "READY_TO_PUBLISH", "distributor", check.reason);
        await transition(productId, "READY_TO_PUBLISH", "APPROVED", "orchestrator", "regerar copy com preço atualizado");
        return { action: "requeued", productId, reason: check.reason };
      }
      await transition(productId, "PUBLISHING", "FAILED", "distributor", check.reason, { lastError: check.reason });
      await transition(productId, "FAILED", "REJECTED", "distributor", check.reason, { rejectionReason: check.reason });
      return { action: "failed", productId, reason: check.reason };
    }
  } catch (err) {
    await recordFailure("connection_lost", `revalidação: ${errMsg(err)}`);
    await prisma.publication.update({ where: { id: pub.id }, data: { status: "QUEUED", error: errMsg(err) } });
    await transition(productId, "PUBLISHING", "READY_TO_PUBLISH", "distributor", `revalidação falhou: ${errMsg(err)}`);
    return { action: "failed", productId, reason: errMsg(err) };
  }

  if (channel === "manual") {
    await prisma.publication.update({ where: { id: pub.id }, data: { status: "MANUAL_PENDING" } });
    await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "info", message: "aguardando envio manual pelo operador" } });
    return { action: "manual_queued", productId, publicationId: pub.id };
  }

  await prisma.publication.update({ where: { id: pub.id }, data: { status: "SENDING", attempts: { increment: 1 } } });
  try {
    const r = await sendToChannel(channel, copy.message);
    await prisma.publication.update({
      where: { id: pub.id },
      data: { status: channel === "dry_run" ? "DRY_RUN" : "SENT", externalId: r.externalId, sentAt: new Date(), error: null },
    });
    await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "info", message: `enviado via ${channel}`, meta: { externalId: r.externalId } } });
    await transition(productId, "PUBLISHING", "PUBLISHED", "distributor", channel);
    await recordSuccess();
    if (channel === "dry_run") await incr("dryRunPublished");
    else {
      await incr("published");
      const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      if (p.commissionValue) await addEstimatedCommission(Number(p.commissionValue));
    }
    return { action: "published", productId, publicationId: pub.id };
  } catch (err) {
    const msg = errMsg(err);
    const kind = err instanceof ChannelError ? err.kind : "send_error";
    const updated = await prisma.publication.update({ where: { id: pub.id }, data: { status: "FAILED", error: msg } });
    await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "error", message: msg, meta: { kind } } });
    await recordFailure(kind, msg);
    await incr("failed");
    if (updated.attempts < settings.maxRetries && kind !== "permission_denied") {
      await prisma.publication.update({ where: { id: pub.id }, data: { status: "QUEUED" } });
      await transition(productId, "PUBLISHING", "READY_TO_PUBLISH", "distributor", `retentativa ${updated.attempts}/${settings.maxRetries}: ${msg}`);
      return { action: "requeued", productId, reason: msg };
    }
    await transition(productId, "PUBLISHING", "FAILED", "distributor", msg, { lastError: msg });
    await logEvent("error", "distributor", `publicação falhou definitivamente: ${msg}`, { productId });
    return { action: "failed", productId, reason: msg };
  }
}

/** Operador confirma que enviou manualmente a mensagem no grupo. */
export async function confirmManual(publicationId: string, by: string) {
  const pub = await prisma.publication.findUniqueOrThrow({ where: { id: publicationId } });
  if (pub.status !== "MANUAL_PENDING") throw new Error("publicação não está aguardando envio manual");
  await prisma.publication.update({ where: { id: pub.id }, data: { status: "MANUAL_CONFIRMED", sentAt: new Date() } });
  await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "info", message: `envio manual confirmado por ${by}` } });
  await transition(pub.productId, "PUBLISHING", "PUBLISHED", by, "envio manual confirmado");
  await incr("published");
  const p = await prisma.product.findUniqueOrThrow({ where: { id: pub.productId } });
  if (p.commissionValue) await addEstimatedCommission(Number(p.commissionValue));
}

export async function cancelManual(publicationId: string, by: string) {
  const pub = await prisma.publication.findUniqueOrThrow({ where: { id: publicationId } });
  if (pub.status !== "MANUAL_PENDING") throw new Error("publicação não está aguardando envio manual");
  await prisma.publication.update({ where: { id: pub.id }, data: { status: "CANCELLED" } });
  await prisma.publicationLog.create({ data: { publicationId: pub.id, level: "info", message: `cancelado por ${by}` } });
  await transition(pub.productId, "PUBLISHING", "READY_TO_PUBLISH", by, "envio manual cancelado");
}
