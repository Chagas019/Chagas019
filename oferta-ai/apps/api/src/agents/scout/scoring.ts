import type { RawOffer } from "../../integrations/shopee/types";

/**
 * Algoritmo de qualidade 0–100.
 *  Competitividade do preço 25 | Avaliações 25 | Vendas 20 | Reputação da loja 15 | Desconto comprovado 10 | Comissão 5
 * Regra: dado ausente = 0 ponto no critério + registrado como "indisponível". Nada é presumido.
 */
export interface ScoreCriterion {
  points: number;
  max: number;
  available: boolean;
  basis: string;
}

export interface ScoreBreakdown {
  total: number;
  price: ScoreCriterion;
  rating: ScoreCriterion;
  sales: ScoreCriterion;
  store: ScoreCriterion;
  discount: ScoreCriterion;
  commission: ScoreCriterion;
}

export interface ScoringContext {
  /** Mediana de preço de itens comparáveis (mesma palavra-chave/categoria, lote + histórico). */
  comparableMedian: number | null;
  comparableCount: number;
  /** Mediana histórica de preço deste item (30 dias), se houver histórico suficiente. */
  historicalMedian: number | null;
  historicalPoints: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export const MIN_COMPARABLES = 5;
export const MIN_HISTORY_POINTS = 5;

export function scorePrice(price: number | null, ctx: ScoringContext): ScoreCriterion {
  if (price === null || ctx.comparableMedian === null || ctx.comparableCount < MIN_COMPARABLES) {
    return { points: 0, max: 25, available: false, basis: `comparáveis insuficientes (${ctx.comparableCount}/${MIN_COMPARABLES})` };
  }
  const ratio = price / ctx.comparableMedian;
  // ratio <= 0.6 → 25 pts | ratio >= 1.4 → 0 pts | linear entre
  const pts = 25 * clamp((1.4 - ratio) / 0.8, 0, 1);
  return { points: round1(pts), max: 25, available: true, basis: `preço ${(ratio * 100).toFixed(0)}% da mediana de ${ctx.comparableCount} comparáveis` };
}

export function scoreRating(rating: number | null): ScoreCriterion {
  if (rating === null || rating <= 0) return { points: 0, max: 25, available: false, basis: "avaliação não informada" };
  // 3.5 → 0 | 4.9+ → 25
  const pts = 25 * clamp((rating - 3.5) / 1.4, 0, 1);
  return { points: round1(pts), max: 25, available: true, basis: `nota ${rating}/5` };
}

export function scoreSales(sales: number | null): ScoreCriterion {
  if (sales === null) return { points: 0, max: 20, available: false, basis: "vendas não informadas" };
  // escala logarítmica: 10 → 5 | 100 → 10 | 1.000 → 15 | 10.000+ → 20
  const pts = 20 * clamp(Math.log10(sales + 1) / 4, 0, 1);
  return { points: round1(pts), max: 20, available: true, basis: `${sales} vendas` };
}

/** shopType da Shopee: 1 = Shopee Mall (oficial), 4 = Indicado Star+, 2 = Indicado Star. Lista vazia = loja comum. */
export function scoreStore(shopType: number[] | null): ScoreCriterion {
  if (shopType === null) return { points: 0, max: 15, available: false, basis: "tipo de loja não informado" };
  if (shopType.includes(1)) return { points: 15, max: 15, available: true, basis: "Shopee Mall (loja oficial)" };
  if (shopType.includes(4)) return { points: 13, max: 15, available: true, basis: "Loja Indicada Star+" };
  if (shopType.includes(2)) return { points: 11, max: 15, available: true, basis: "Loja Indicada Star" };
  return { points: 5, max: 15, available: true, basis: "loja comum (sem selo)" };
}

/**
 * Desconto comprovado: prioridade ao histórico próprio (preço atual vs mediana 30d).
 * Sem histórico suficiente, usa o desconto informado pela própria plataforma (fonte registrada).
 */
export function scoreDiscount(offer: RawOffer, ctx: ScoringContext): ScoreCriterion & { pct: number | null; source: string | null } {
  const price = offer.priceMin;
  if (price !== null && ctx.historicalMedian !== null && ctx.historicalPoints >= MIN_HISTORY_POINTS) {
    const pct = Math.max(0, (1 - price / ctx.historicalMedian) * 100);
    return {
      points: round1(10 * clamp(pct / 50, 0, 1)),
      max: 10,
      available: true,
      basis: `${pct.toFixed(0)}% abaixo da mediana histórica (${ctx.historicalPoints} registros)`,
      pct: Math.round(pct),
      source: "history",
    };
  }
  if (offer.priceDiscountRate !== null && offer.priceDiscountRate > 0) {
    const pct = offer.priceDiscountRate;
    return { points: round1(10 * clamp(pct / 50, 0, 1)), max: 10, available: true, basis: `${pct}% informado pela Shopee`, pct, source: "platform" };
  }
  return { points: 0, max: 10, available: offer.priceDiscountRate !== null, basis: "sem desconto comprovado", pct: null, source: null };
}

export function scoreCommission(rate: number | null): ScoreCriterion {
  if (rate === null) return { points: 0, max: 5, available: false, basis: "comissão não informada" };
  return { points: round1(5 * clamp(rate / 0.1, 0, 1)), max: 5, available: true, basis: `${(rate * 100).toFixed(1)}% de comissão` };
}

export function scoreOffer(offer: RawOffer, ctx: ScoringContext): ScoreBreakdown & { discountPct: number | null; discountSource: string | null } {
  const price = scorePrice(offer.priceMin, ctx);
  const rating = scoreRating(offer.ratingStar);
  const sales = scoreSales(offer.sales);
  const store = scoreStore(offer.shopType);
  const d = scoreDiscount(offer, ctx);
  const commission = scoreCommission(offer.commissionRate);
  const discount: ScoreCriterion = { points: d.points, max: d.max, available: d.available, basis: d.basis };
  const total = round1(price.points + rating.points + sales.points + store.points + discount.points + commission.points);
  return { total, price, rating, sales, store, discount, commission, discountPct: d.pct, discountSource: d.source };
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
