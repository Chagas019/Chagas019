import crypto from "node:crypto";
import { Prisma, Product } from "@prisma/client";
import { prisma, redis, logEvent, errMsg } from "../../lib/core";
import { getSettings } from "../../lib/settings";
import { incr } from "../../lib/metrics";
import { getOfferProvider, type OfferProvider, type RawOffer } from "../../integrations/shopee";
import { getLlm } from "../../integrations/ai/llm";
import { env } from "../../config/env";
import { runAgentTask } from "../runtime";
import { transition } from "../../orchestrator/states";
import { exclusionReason } from "./filters";
import { median, scoreOffer } from "./scoring";
import { planRotation, CATEGORIES } from "./categories";

export const SCOUT_PROMPT_VERSION = "scout-v1";
export const SCOUT_IDENTITY = "Pesquisador profissional de ofertas: encontra produtos com preços competitivos e boas avaliações, sem inventar dados.";
export const SCOUT_SYSTEM_PROMPT = `Você é o SCOUT AI da OFERTA AI, pesquisador de ofertas da Shopee Brasil.
Sua função neste prompt é sugerir palavras-chave de busca em português para uma categoria, para aumentar a variedade da descoberta.
Sugira termos de produtos concretos que consumidores brasileiros buscam. Não invente marcas, preços ou dados.`;

const CURSOR_KEY = "oferta:scout:cursor";
const EXTRA_KW_KEY = (c: string) => `oferta:scout:kw:${c}`;
const ACTIVE_STATES = ["APPROVED", "COPY_GENERATED", "READY_TO_PUBLISH", "PUBLISHING"] as const;

export interface ScoutSummary {
  searched: Array<{ category: string; keyword: string; sortType: number; found: number; error?: string }>;
  researched: number;
  approved: string[];
  rejected: number;
  skipped: number;
}

async function extraKeywords(categories: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const c of categories) out[c] = await redis().smembers(EXTRA_KW_KEY(c));
  return out;
}

/** Descoberta assistida por IA (opcional): sugere novas palavras-chave para uma categoria. */
async function discoverKeywords(category: string): Promise<string[]> {
  const llm = await getLlm();
  if (!llm) return [];
  try {
    const r = await llm.json<{ keywords: string[] }>({
      system: SCOUT_SYSTEM_PROMPT,
      user: `Categoria: ${category}\nPalavras já usadas: ${(CATEGORIES[category] ?? []).join(", ")}\nSugira 3 novas palavras-chave curtas (2 a 3 palavras), diferentes das já usadas.`,
      schema: {
        type: "object",
        properties: { keywords: { type: "array", items: { type: "string" } } },
        required: ["keywords"],
        additionalProperties: false,
      },
      maxTokens: 2000,
    });
    const kws = r.data.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 3 && k.length <= 40).slice(0, 3);
    if (kws.length) {
      await redis().sadd(EXTRA_KW_KEY(category), ...kws);
      // limita o conjunto para não crescer indefinidamente
      const all = await redis().smembers(EXTRA_KW_KEY(category));
      if (all.length > 12) await redis().srem(EXTRA_KW_KEY(category), ...all.slice(0, all.length - 12));
    }
    return kws;
  } catch (err) {
    await logEvent("warn", "scout", `descoberta de palavras-chave por IA falhou: ${errMsg(err)}`);
    return [];
  }
}

async function recentlyPublishedIds(days: number): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.publication.findMany({
    where: { sentAt: { gte: since }, status: { in: ["SENT", "MANUAL_CONFIRMED", "DRY_RUN"] } },
    select: { product: { select: { externalId: true } } },
  });
  return new Set(rows.map((r) => r.product.externalId));
}

async function historicalMedian(productId: string | null): Promise<{ median: number | null; points: number }> {
  if (!productId) return { median: null, points: 0 };
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.productPrice.findMany({ where: { productId, capturedAt: { gte: since } }, select: { price: true } });
  return { median: median(rows.map((r) => Number(r.price))), points: rows.length };
}

async function comparablePrices(category: string, batch: RawOffer[]): Promise<number[]> {
  const fromBatch = batch.map((o) => o.priceMin).filter((p): p is number => p !== null && p > 0);
  const since = new Date(Date.now() - 14 * 86_400_000);
  const fromDb = await prisma.product.findMany({
    where: { category, lastSeenAt: { gte: since }, currentPrice: { not: null } },
    select: { currentPrice: true },
    take: 200,
  });
  return [...fromBatch, ...fromDb.map((p) => Number(p.currentPrice))];
}

function dec(v: number | null | undefined) {
  return v === null || v === undefined ? null : new Prisma.Decimal(v.toFixed(2));
}

async function ensureAffiliateLink(provider: OfferProvider, product: Product, offer: RawOffer): Promise<void> {
  const exists = await prisma.affiliateLink.findFirst({ where: { productId: product.id }, orderBy: { createdAt: "desc" } });
  if (exists) return;
  let url = offer.offerLink;
  let origin = provider.source === "SANDBOX" ? "sandbox" : "offerLink";
  if (!url && offer.productLink) {
    url = await provider.generateShortLink(offer.productLink, [env.SHOPEE_SUB_ID]);
    origin = "generateShortLink";
  }
  if (!url) throw new Error("não foi possível gerar link de afiliado");
  await prisma.affiliateLink.create({
    data: { productId: product.id, url, origin, trackCode: crypto.randomBytes(5).toString("base64url") },
  });
}

/** Avalia um único produto (já com contexto de lote). Exportado para testes. */
export async function evaluateOffer(
  offer: RawOffer,
  ctx: { category: string; keyword: string; source: "LIVE" | "SANDBOX"; comparables: number[]; seen: Set<string>; recent: Set<string>; minScore: number; minStoreScore: number; provider: OfferProvider },
): Promise<"approved" | "rejected" | "skipped"> {
  const existing = offer.externalId
    ? await prisma.product.findUnique({ where: { source_externalId: { source: ctx.source, externalId: offer.externalId } } })
    : null;
  if (existing && (ACTIVE_STATES as readonly string[]).includes(existing.state)) {
    ctx.seen.add(offer.externalId);
    return "skipped"; // já em processamento no pipeline
  }

  const reason = exclusionReason(offer, { seenInBatch: ctx.seen, recentlyPublished: ctx.recent, minStoreScore: ctx.minStoreScore });
  if (offer.externalId) ctx.seen.add(offer.externalId);
  if (reason && reason.startsWith("duplicado")) return "skipped";

  const base = {
    shopId: offer.shopId,
    name: offer.name || "(sem nome)",
    category: ctx.category,
    keyword: ctx.keyword,
    shopName: offer.shopName,
    shopType: (offer.shopType ?? undefined) as Prisma.InputJsonValue | undefined,
    imageUrl: offer.imageUrl,
    productLink: offer.productLink,
    currentPrice: dec(offer.priceMin),
    rating: offer.ratingStar,
    sales: offer.sales,
    commissionRate: offer.commissionRate,
    commissionValue: dec(offer.commission ?? (offer.priceMin !== null && offer.commissionRate !== null ? offer.priceMin * offer.commissionRate : null)),
    offerEndsAt: offer.periodEndTime,
    unavailableData: offer.unavailable,
    lastSeenAt: new Date(),
  };

  let product: Product;
  if (!existing) {
    if (!offer.externalId) return "skipped";
    product = await prisma.product.create({ data: { ...base, externalId: offer.externalId, source: ctx.source, state: "PENDING" } });
    await prisma.productStateHistory.create({ data: { productId: product.id, toState: "PENDING", actor: "scout", reason: "descoberto" } });
    await transition(product.id, "PENDING", "RESEARCHING", "scout");
  } else {
    product = await prisma.product.update({ where: { id: existing.id }, data: base });
    if (existing.state === "FAILED") await transition(product.id, "FAILED", "PENDING", "scout", "reavaliação");
    const cur = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).state;
    if (cur === "PENDING") await transition(product.id, "PENDING", "RESEARCHING", "scout");
    else if (cur === "REJECTED" || cur === "PUBLISHED") await transition(product.id, cur, "RESEARCHING", "scout", "reavaliação");
  }

  // Histórico de preços e avaliações (sempre registrado)
  if (offer.priceMin !== null && offer.priceMin > 0) {
    await prisma.productPrice.create({
      data: { productId: product.id, price: dec(offer.priceMin)!, priceMax: dec(offer.priceMax), discountRate: offer.priceDiscountRate },
    });
  }
  await prisma.productReview.create({ data: { productId: product.id, rating: offer.ratingStar, sales: offer.sales } });

  if (reason) {
    await transition(product.id, "RESEARCHING", "REJECTED", "scout", reason, { rejectionReason: reason, score: null });
    return "rejected";
  }

  const hist = await historicalMedian(product.id);
  // exclui o ponto recém-inserido do histórico para não comparar o preço com ele mesmo
  const histCtx = { median: hist.points > 1 ? hist.median : null, points: Math.max(0, hist.points - 1) };
  const score = scoreOffer(offer, {
    comparableMedian: median(ctx.comparables),
    comparableCount: ctx.comparables.length,
    historicalMedian: histCtx.median,
    historicalPoints: histCtx.points,
  });

  const originalPrice =
    score.discountSource === "platform" && offer.priceDiscountRate && offer.priceMin
      ? offer.priceMin / (1 - offer.priceDiscountRate / 100)
      : score.discountSource === "history" && hist.median
        ? hist.median
        : null;

  const scoreData = {
    score: score.total,
    scoreBreakdown: score as unknown as Prisma.InputJsonValue,
    discountRate: score.discountPct,
    discountSource: score.discountSource,
    originalPrice: dec(originalPrice),
    priority: Math.round(score.total * 10),
  };

  if (score.total < ctx.minScore) {
    const r = `nota ${score.total} abaixo do mínimo ${ctx.minScore}`;
    await transition(product.id, "RESEARCHING", "REJECTED", "scout", r, { ...scoreData, rejectionReason: r });
    return "rejected";
  }

  try {
    await ensureAffiliateLink(ctx.provider, product, offer);
  } catch (err) {
    await transition(product.id, "RESEARCHING", "FAILED", "scout", `link de afiliado: ${errMsg(err)}`, { ...scoreData, lastError: errMsg(err) });
    return "rejected";
  }
  await transition(product.id, "RESEARCHING", "APPROVED", "scout", `nota ${score.total}`, { ...scoreData, rejectionReason: null });
  return "approved";
}

/** Ciclo de pesquisa do Scout. */
export async function runScoutCycle(trigger: string): Promise<ScoutSummary | null> {
  const settings = await getSettings();
  const taskKey = `scout:${trigger}`;
  return runAgentTask(
    "SCOUT",
    "ciclo de pesquisa",
    { trigger, keywordsPerCycle: settings.keywordsPerCycle },
    async () => {
      const provider = await getOfferProvider();
      const cursor = Number((await redis().get(CURSOR_KEY)) ?? 0);
      const cats = settings.enabledCategories.length ? settings.enabledCategories : Object.keys(CATEGORIES);
      const plan = planRotation(cats, cursor, settings.keywordsPerCycle, await extraKeywords(cats));
      await redis().set(CURSOR_KEY, String(cursor + plan.length));
      discoverKeywords(plan[0].category).catch(() => undefined);

      const recent = await recentlyPublishedIds(settings.dedupDays);
      const seen = new Set<string>();
      const summary: ScoutSummary = { searched: [], researched: 0, approved: [], rejected: 0, skipped: 0 };

      for (const step of plan) {
        if ((await getSettings()).systemHalted) break;
        let offers: RawOffer[] = [];
        try {
          const r = await provider.searchOffers({ keyword: step.keyword, sortType: step.sortType, limit: settings.productsPerKeyword });
          offers = r.offers;
          summary.searched.push({ ...step, found: offers.length });
        } catch (err) {
          summary.searched.push({ ...step, found: 0, error: errMsg(err) });
          await logEvent("error", "scout", `busca falhou (${step.keyword}): ${errMsg(err)}`);
          continue;
        }
        const comparables = await comparablePrices(step.category, offers);
        for (const offer of offers) {
          const r = await evaluateOffer(offer, {
            category: step.category,
            keyword: step.keyword,
            source: provider.source,
            comparables,
            seen,
            recent,
            minScore: settings.minScore,
            minStoreScore: settings.minStoreScore,
            provider,
          });
          if (r === "skipped") summary.skipped++;
          else {
            summary.researched++;
            if (r === "approved") summary.approved.push(offer.externalId);
            else summary.rejected++;
          }
        }
      }
      await incr("researched", summary.researched);
      await incr("approved", summary.approved.length);
      await incr("rejected", summary.rejected);
      await logEvent("info", "scout", `ciclo concluído: ${summary.researched} avaliados, ${summary.approved.length} aprovados, ${summary.rejected} rejeitados`);
      return { output: summary };
    },
    { taskKey },
  );
}
