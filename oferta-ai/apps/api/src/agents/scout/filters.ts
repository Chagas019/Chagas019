import type { RawOffer } from "../../integrations/shopee/types";
import { scoreStore } from "./scoring";

/** Filtros de exclusão do Scout. Retorna o motivo da rejeição ou null se aprovado nos filtros. */
export interface FilterContext {
  /** externalIds já vistos neste ciclo */
  seenInBatch: Set<string>;
  /** externalIds publicados dentro da janela de deduplicação */
  recentlyPublished: Set<string>;
  minStoreScore: number;
  now?: Date;
}

export function exclusionReason(o: RawOffer, ctx: FilterContext): string | null {
  // Dados insuficientes
  if (!o.externalId || !o.name) return "dados insuficientes: sem identificador ou nome";
  if (!o.offerLink && !o.productLink) return "dados insuficientes: sem link do produto";
  const signals = [o.ratingStar, o.sales, o.shopType].filter((x) => x !== null).length;
  if (signals < 2) return "dados insuficientes: menos de 2 sinais de qualidade (avaliação, vendas, loja)";

  // Preço válido
  if (o.priceMin === null || !(o.priceMin > 0)) return "sem preço válido";

  // Disponibilidade (oferta com período encerrado)
  const now = ctx.now ?? new Date();
  if (o.periodEndTime && o.periodEndTime.getTime() < now.getTime()) return "indisponível: período da oferta encerrado";

  // Informações inconsistentes
  if (o.priceMax !== null && o.priceMax < o.priceMin) return "inconsistente: preço máximo menor que o mínimo";
  if (o.ratingStar !== null && (o.ratingStar < 0 || o.ratingStar > 5)) return "inconsistente: avaliação fora de 0–5";
  if (o.priceDiscountRate !== null && (o.priceDiscountRate < 0 || o.priceDiscountRate >= 95)) return "inconsistente: desconto fora do intervalo plausível";
  if (o.sales !== null && o.sales < 0) return "inconsistente: vendas negativas";
  if (o.commissionRate !== null && (o.commissionRate < 0 || o.commissionRate > 1)) return "inconsistente: comissão fora de 0–100%";

  // Duplicados
  if (ctx.seenInBatch.has(o.externalId)) return "duplicado no ciclo";
  if (ctx.recentlyPublished.has(o.externalId)) return "duplicado: publicado recentemente";

  // Reputação da loja
  const store = scoreStore(o.shopType);
  if (store.available && store.points < ctx.minStoreScore) return `reputação da loja insuficiente (${store.basis})`;

  return null;
}
