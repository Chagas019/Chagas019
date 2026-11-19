import { describe, it, expect } from "vitest";
import { scoreOffer, scoreRating, scoreSales, scoreStore, scorePrice, scoreCommission, median } from "../src/agents/scout/scoring";
import { exclusionReason } from "../src/agents/scout/filters";
import { planRotation, ALL_CATEGORIES } from "../src/agents/scout/categories";
import { buildMessage, brl, DISCLAIMER_AFFILIATE, DISCLAIMER_PRICE } from "../src/agents/copywriter/message";
import { validateCreative, validateMessage } from "../src/agents/copywriter/validator";
import { templateCreative } from "../src/agents/copywriter/copywriter";
import { canPublishNow, effectiveIntervalMinutes, inWindow } from "../src/agents/distributor/schedule";
import { signShopee, authHeader, normalizeNode, ShopeeAffiliateClient, ShopeeApiError } from "../src/integrations/shopee/client";
import { encrypt, decrypt, mask } from "../src/lib/crypto";
import { canTransition } from "../src/orchestrator/states";
import { localDate, hhmmToMinutes } from "../src/lib/time";
import type { RawOffer } from "../src/integrations/shopee/types";

const offer = (o: Partial<RawOffer> = {}): RawOffer => ({
  externalId: "1",
  shopId: "s",
  name: "Fone Bluetooth X",
  shopName: "Loja",
  shopType: [1],
  imageUrl: null,
  productLink: "https://shopee.com.br/p/1",
  offerLink: "https://s.shopee.com.br/abc",
  priceMin: 80,
  priceMax: 90,
  priceDiscountRate: 40,
  ratingStar: 4.8,
  sales: 5000,
  commissionRate: 0.08,
  commission: null,
  periodEndTime: null,
  unavailable: [],
  ...o,
});
const ctx = { comparableMedian: 100, comparableCount: 10, historicalMedian: null, historicalPoints: 0 };

describe("Scout — pontuação", () => {
  it("pesos máximos somam 100", () => {
    const s = scoreOffer(offer(), ctx);
    expect(s.price.max + s.rating.max + s.sales.max + s.store.max + s.discount.max + s.commission.max).toBe(100);
  });
  it("produto forte é aprovado (>=75)", () => {
    const s = scoreOffer(offer(), ctx);
    expect(s.total).toBeGreaterThanOrEqual(75);
  });
  it("dado ausente vale zero e é marcado indisponível (não inventa)", () => {
    expect(scoreRating(null)).toMatchObject({ points: 0, available: false });
    expect(scoreSales(null)).toMatchObject({ points: 0, available: false });
    expect(scoreStore(null)).toMatchObject({ points: 0, available: false });
    expect(scoreCommission(null)).toMatchObject({ points: 0, available: false });
    expect(scorePrice(80, { ...ctx, comparableCount: 2 })).toMatchObject({ points: 0, available: false });
  });
  it("faixas de avaliação, vendas e loja", () => {
    expect(scoreRating(4.9).points).toBe(25);
    expect(scoreRating(3.5).points).toBe(0);
    expect(scoreSales(9999).points).toBe(20);
    expect(scoreSales(99).points).toBe(10);
    expect(scoreStore([1]).points).toBe(15);
    expect(scoreStore([]).points).toBe(5);
  });
  it("desconto: histórico tem prioridade sobre o informado pela plataforma", () => {
    const s = scoreOffer(offer({ priceMin: 50, priceDiscountRate: 10 }), { ...ctx, historicalMedian: 100, historicalPoints: 10 });
    expect(s.discountSource).toBe("history");
    expect(s.discountPct).toBe(50);
    expect(s.discount.points).toBe(10);
  });
  it("mediana", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("Scout — filtros de exclusão", () => {
  const fctx = () => ({ seenInBatch: new Set<string>(), recentlyPublished: new Set<string>(), minStoreScore: 5 });
  it("aprova oferta válida", () => expect(exclusionReason(offer(), fctx())).toBeNull());
  it("sem preço", () => expect(exclusionReason(offer({ priceMin: null }), fctx())).toMatch(/preço/));
  it("dados insuficientes", () => expect(exclusionReason(offer({ ratingStar: null, sales: null }), fctx())).toMatch(/insuficientes/));
  it("indisponível", () => expect(exclusionReason(offer({ periodEndTime: new Date(Date.now() - 1000) }), fctx())).toMatch(/indisponível/));
  it("inconsistente", () => {
    expect(exclusionReason(offer({ priceMax: 10 }), fctx())).toMatch(/inconsistente/);
    expect(exclusionReason(offer({ ratingStar: 7 }), fctx())).toMatch(/inconsistente/);
    expect(exclusionReason(offer({ priceDiscountRate: 99 }), fctx())).toMatch(/inconsistente/);
  });
  it("duplicados", () => {
    const c = fctx();
    c.seenInBatch.add("1");
    expect(exclusionReason(offer(), c)).toMatch(/duplicado/);
    const c2 = fctx();
    c2.recentlyPublished.add("1");
    expect(exclusionReason(offer(), c2)).toMatch(/publicado recentemente/);
  });
  it("reputação insuficiente", () => expect(exclusionReason(offer({ shopType: [] }), { ...fctx(), minStoreScore: 11 })).toMatch(/reputação/));
});

describe("Scout — rotação de categorias", () => {
  it("alterna categorias consecutivas", () => {
    const plan = planRotation(ALL_CATEGORIES, 0, ALL_CATEGORIES.length);
    expect(new Set(plan.map((p) => p.category)).size).toBe(ALL_CATEGORIES.length);
  });
  it("continua de onde parou e varia a ordenação", () => {
    const a = planRotation(["A", "B"], 0, 6, { A: ["a1", "a2"], B: ["b1"] });
    expect(a.map((p) => p.category)).toEqual(["A", "B", "A", "B", "A", "B"]);
    expect(new Set(a.map((p) => p.sortType)).size).toBeGreaterThan(1);
  });
});

describe("Copywriter — mensagem e validação", () => {
  const data = { name: "Fone X", currentPrice: 79.9, originalPrice: 129.9, rating: 4.8, sales: 1520, link: "https://s.shopee.com.br/abc", headline: "Som livre de fios 🎧", description: "Ideal para treinos e chamadas." };
  it("segue a estrutura exigida", () => {
    const m = buildMessage(data);
    expect(m.startsWith("🔥 OFERTA ENCONTRADA!")).toBe(true);
    expect(m).toContain(`💰 De: ${brl(129.9)}`);
    expect(m).toContain(`🔥 Por apenas: ${brl(79.9)}`);
    expect(m).toContain("⭐ Avaliação: 4,8/5");
    expect(m).toContain("🛒 Vendas: 1.520");
    expect(m).toContain("🛍️ COMPRE AQUI:\nhttps://s.shopee.com.br/abc");
    expect(m).toContain(DISCLAIMER_PRICE);
    expect(m).toContain(DISCLAIMER_AFFILIATE);
  });
  it("omite 'De', avaliação e vendas quando não há dado", () => {
    const m = buildMessage({ ...data, originalPrice: null, rating: null, sales: null });
    expect(m).not.toContain("De:");
    expect(m).not.toContain("Avaliação");
    expect(m).not.toContain("Vendas");
  });
  it("bloqueia urgência falsa, números e claims", () => {
    expect(validateCreative({ headline: "Últimas unidades!", description: "Corra" }).join()).toMatch(/urgência/);
    expect(validateCreative({ headline: "50% OFF", description: "ok" }).join()).toMatch(/números/);
    expect(validateCreative({ headline: "O mais vendido", description: "Com frete grátis" }).join()).toMatch(/não verificável/);
    expect(validateCreative({ headline: "Som livre de fios", description: "Ideal para treinos." })).toEqual([]);
  });
  it("valida a mensagem final", () => {
    const m = buildMessage(data);
    expect(validateMessage(m, { link: data.link, priceText: brl(79.9), originalPriceText: brl(129.9) })).toEqual([]);
    expect(validateMessage(m, { link: "https://outro", priceText: brl(70), originalPriceText: null }).length).toBeGreaterThanOrEqual(3);
  });
  it("template sem IA é válido e varia por produto", () => {
    const a = templateCreative({ id: "a1", name: "x", category: "Cozinha", rating: 4.7, sales: 2000 });
    const b = templateCreative({ id: "zz9", name: "x", category: "Pet", rating: null, sales: null });
    expect(validateCreative(a)).toEqual([]);
    expect(validateCreative(b)).toEqual([]);
    expect(a.description).not.toEqual(b.description);
  });
});

describe("Distributor — agenda", () => {
  const settings = { publishWindowStart: "08:00", publishWindowEnd: "22:00", dailyGoal: 30, dailyLimit: 30, minIntervalMinutes: 15, systemHalted: false, publishingPaused: false };
  const now = new Date();
  it("distribui 30 ofertas em 14h = 28 min", () => expect(effectiveIntervalMinutes("08:00", "22:00", 30, 15)).toBe(28));
  it("janela que cruza a meia-noite", () => {
    expect(inWindow(hhmmToMinutes("23:30"), "22:00", "02:00")).toBe(true);
    expect(inWindow(hhmmToMinutes("03:00"), "22:00", "02:00")).toBe(false);
  });
  it("regras de bloqueio", () => {
    const base = { now, nowMin: 600, lastPublishedAt: null, publishedToday: 0, settings };
    expect(canPublishNow(base).ok).toBe(true);
    expect(canPublishNow({ ...base, nowMin: 300 })).toMatchObject({ ok: false, reason: expect.stringMatching(/janela/) });
    expect(canPublishNow({ ...base, publishedToday: 30 })).toMatchObject({ ok: false, reason: expect.stringMatching(/limite/) });
    expect(canPublishNow({ ...base, lastPublishedAt: new Date(now.getTime() - 5 * 60_000) })).toMatchObject({ ok: false, reason: expect.stringMatching(/intervalo/) });
    expect(canPublishNow({ ...base, settings: { ...settings, systemHalted: true } })).toMatchObject({ ok: false });
    expect(canPublishNow({ ...base, settings: { ...settings, publishingPaused: true } })).toMatchObject({ ok: false });
  });
});

describe("Shopee Affiliate API — cliente", () => {
  it("assinatura SHA256(AppId+Timestamp+Payload+Secret)", () => {
    const sig = signShopee("123", 1700000000, '{"query":"{x}"}', "sec");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(authHeader("123", "sec", '{"query":"{x}"}', 1700000000_000)).toBe(`SHA256 Credential=123, Timestamp=1700000000, Signature=${sig}`);
  });
  it("normaliza sem inventar dados ausentes", () => {
    const n = normalizeNode({ itemId: 99, productName: "P", priceMin: "10.50", ratingStar: "4.6", shopType: [2] });
    expect(n).toMatchObject({ externalId: "99", priceMin: 10.5, ratingStar: 4.6, shopType: [2], sales: null, commissionRate: null });
    expect(n.unavailable).toEqual(expect.arrayContaining(["sales", "commissionRate", "priceDiscountRate", "offerLink"]));
  });
  it("exige credenciais (não simula conexão)", () => {
    expect(() => new ShopeeAffiliateClient("", "", "https://x")).toThrow(/Credenciais/);
  });
  it("envia cabeçalho assinado e trata erros GraphQL", async () => {
    let seen: RequestInit | undefined;
    const fakeFetch = (async (_u: string, init: RequestInit) => {
      seen = init;
      return new Response(JSON.stringify({ errors: [{ message: "Invalid Signature", extensions: { code: 10020 } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const c = new ShopeeAffiliateClient("app", "sec", "https://api.test/graphql", fakeFetch);
    await expect(c.searchOffers({ keyword: "x" })).rejects.toBeInstanceOf(ShopeeApiError);
    expect(String((seen!.headers as Record<string, string>).Authorization)).toMatch(/^SHA256 Credential=app, Timestamp=\d+, Signature=[a-f0-9]{64}$/);
  });
});

describe("Segurança e utilitários", () => {
  it("AES-256-GCM ida e volta + detecção de adulteração", () => {
    const enc = encrypt("token-secreto");
    expect(enc).not.toContain("token-secreto");
    expect(decrypt(enc)).toBe("token-secreto");
    const parts = enc.split(":");
    parts[3] = Buffer.from("xx").toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
  it("mascara segredos", () => expect(mask("abcdefghij")).toBe("••••ghij"));
  it("máquina de estados", () => {
    expect(canTransition("APPROVED", "COPY_GENERATED")).toBe(true);
    expect(canTransition("PENDING", "PUBLISHED")).toBe(false);
    expect(canTransition("APPROVED", "PUBLISHING")).toBe(false);
  });
  it("fuso America/Sao_Paulo", () => {
    expect(localDate(new Date("2026-01-01T02:00:00Z"))).toBe("2025-12-31");
  });
});
