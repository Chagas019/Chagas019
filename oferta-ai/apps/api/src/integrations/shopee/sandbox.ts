import crypto from "node:crypto";
import type { OfferProvider, RawOffer, SearchParams } from "./types";

/**
 * AMBIENTE DE TESTES — produtos FICTÍCIOS.
 * Usado somente quando DATA_MODE=sandbox. Não representa a Shopee e não se conecta a ela.
 * Todos os nomes recebem o prefixo "[TESTE]" e os links apontam para example.com.
 * Publicações neste modo vão exclusivamente para o canal dry_run (nada é enviado).
 */
function rng(seed: string) {
  let h = crypto.createHash("sha256").update(seed).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) {
      h = crypto.createHash("sha256").update(h).digest();
      i = 0;
    }
    const v = h.readUInt32BE(i) / 0xffffffff;
    i += 4;
    return v;
  };
}

const NOUNS = ["Fone Bluetooth", "Garrafa Térmica", "Organizador", "Luminária LED", "Mochila", "Smartwatch", "Panela Antiaderente", "Tênis Esportivo", "Carregador Turbo", "Kit Skincare", "Caixa de Som", "Mouse Sem Fio"];

export class SandboxOfferProvider implements OfferProvider {
  readonly source = "SANDBOX" as const;

  private make(seed: string, keyword: string, idx: number): RawOffer {
    const r = rng(seed);
    const price = Math.round((15 + r() * 285) * 100) / 100;
    const disc = r() < 0.75 ? Math.round(r() * 60) : null;
    const missingRating = r() < 0.1;
    const missingSales = r() < 0.1;
    const id = String(100000 + Math.floor(r() * 899999));
    return {
      externalId: `SBX-${id}`,
      shopId: `SBXS-${Math.floor(r() * 9999)}`,
      name: `[TESTE] ${NOUNS[Math.floor(r() * NOUNS.length)]} ${keyword} #${idx + 1}`,
      shopName: `Loja Fictícia ${Math.floor(r() * 50)}`,
      shopType: r() < 0.3 ? [1] : r() < 0.5 ? [4] : r() < 0.7 ? [2] : [],
      imageUrl: null,
      productLink: `https://example.com/produto-ficticio/${id}`,
      offerLink: `https://example.com/afiliado-ficticio/${id}`,
      priceMin: price,
      priceMax: Math.round(price * (1 + r() * 0.2) * 100) / 100,
      priceDiscountRate: disc,
      ratingStar: missingRating ? null : Math.round((3.6 + r() * 1.4) * 10) / 10,
      sales: missingSales ? null : Math.floor(Math.pow(10, 1 + r() * 3.6)),
      commissionRate: Math.round((0.02 + r() * 0.1) * 1000) / 1000,
      commission: null,
      periodEndTime: null,
      unavailable: [],
    };
  }

  async searchOffers(p: SearchParams) {
    const limit = p.limit ?? 20;
    const day = new Date().toISOString().slice(0, 10);
    const offers = Array.from({ length: limit }, (_, i) => {
      const o = this.make(`${day}:${p.keyword}:${p.page ?? 1}:${i}`, p.keyword ?? "geral", i);
      o.unavailable = (["priceMin", "ratingStar", "sales", "shopType", "priceDiscountRate", "commissionRate", "offerLink"] as const).filter(
        (k) => o[k] === null,
      );
      return o;
    });
    return { offers, hasNextPage: false };
  }

  async getOfferByItemId(): Promise<RawOffer | null> {
    // No sandbox, o "preço atual" é o que está no banco (sem deriva); retorna null para o Distributor usar o registro.
    return null;
  }

  async generateShortLink(originUrl: string): Promise<string> {
    return originUrl;
  }
}
