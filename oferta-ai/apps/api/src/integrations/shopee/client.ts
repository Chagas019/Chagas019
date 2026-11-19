import crypto from "node:crypto";
import type { OfferProvider, RawOffer, SearchParams } from "./types";

/**
 * Cliente da Shopee Affiliate Open API (GraphQL) — Brasil.
 * Endpoint: https://open-api.affiliate.shopee.com.br/graphql
 * Autenticação: Authorization: SHA256 Credential={AppId}, Timestamp={ts}, Signature={sha256(AppId+ts+payload+Secret)}
 * Credenciais: painel de afiliados (affiliate.shopee.com.br) → Open API. Requer aprovação da Shopee.
 *
 * IMPORTANTE: nada aqui é simulado. Sem credenciais, o cliente não é instanciado.
 */
export class ShopeeApiError extends Error {
  constructor(message: string, public readonly kind: "auth" | "graphql" | "http" | "network", public readonly details?: unknown) {
    super(message);
  }
}

export function signShopee(appId: string, timestamp: number, payload: string, secret: string): string {
  return crypto.createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
}

export function authHeader(appId: string, secret: string, payload: string, now = Date.now()): string {
  const ts = Math.floor(now / 1000);
  return `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signShopee(appId, ts, payload, secret)}`;
}

const OFFER_FIELDS = `
  itemId
  productName
  shopId
  shopName
  shopType
  imageUrl
  productLink
  offerLink
  priceMin
  priceMax
  priceDiscountRate
  ratingStar
  sales
  commissionRate
  commission
  periodEndTime
`;

const EXPECTED: Array<keyof RawOffer> = ["priceMin", "ratingStar", "sales", "shopType", "priceDiscountRate", "commissionRate", "offerLink"];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Normaliza um nó da API sem inventar valores: campo ausente => null + registrado em `unavailable`. */
export function normalizeNode(n: Record<string, unknown>): RawOffer {
  const shopTypeRaw = n.shopType;
  const shopType = Array.isArray(shopTypeRaw)
    ? shopTypeRaw.map(Number).filter(Number.isFinite)
    : shopTypeRaw === null || shopTypeRaw === undefined
      ? null
      : [Number(shopTypeRaw)].filter(Number.isFinite);
  const endRaw = num(n.periodEndTime);
  const offer: RawOffer = {
    externalId: String(n.itemId ?? ""),
    shopId: n.shopId != null ? String(n.shopId) : null,
    name: String(n.productName ?? "").trim(),
    shopName: (n.shopName as string) ?? null,
    shopType,
    imageUrl: (n.imageUrl as string) ?? null,
    productLink: (n.productLink as string) ?? null,
    offerLink: (n.offerLink as string) ?? null,
    priceMin: num(n.priceMin),
    priceMax: num(n.priceMax),
    priceDiscountRate: num(n.priceDiscountRate),
    ratingStar: num(n.ratingStar),
    sales: num(n.sales),
    commissionRate: num(n.commissionRate),
    commission: num(n.commission),
    periodEndTime: endRaw ? new Date(endRaw * 1000) : null,
    unavailable: [],
  };
  offer.unavailable = EXPECTED.filter((k) => offer[k] === null);
  return offer;
}

export class ShopeeAffiliateClient implements OfferProvider {
  readonly source = "LIVE" as const;
  constructor(
    private readonly appId: string,
    private readonly secret: string,
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!appId || !secret) throw new ShopeeApiError("Credenciais da Shopee ausentes (SHOPEE_APP_ID / SHOPEE_APP_SECRET)", "auth");
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const payload = JSON.stringify({ query, variables });
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader(this.appId, this.secret, payload) },
        body: payload,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      throw new ShopeeApiError(`Falha de conexão com a Shopee: ${(err as Error).message}`, "network");
    }
    const text = await res.text();
    let body: { data?: T; errors?: Array<{ message: string; extensions?: { code?: number; message?: string } }> };
    try {
      body = JSON.parse(text);
    } catch {
      throw new ShopeeApiError(`Resposta não-JSON da Shopee (HTTP ${res.status}): ${text.slice(0, 200)}`, "http");
    }
    if (body.errors?.length) {
      const e = body.errors[0];
      const code = e.extensions?.code;
      // Códigos 10020/10031 etc. indicam problemas de assinatura/autorização
      const kind = code && String(code).startsWith("100") ? "auth" : "graphql";
      throw new ShopeeApiError(`Shopee API: ${e.message}${code ? ` (código ${code})` : ""}`, kind, body.errors);
    }
    if (!res.ok) throw new ShopeeApiError(`Shopee HTTP ${res.status}`, "http", text.slice(0, 500));
    if (!body.data) throw new ShopeeApiError("Resposta da Shopee sem 'data'", "graphql");
    return body.data;
  }

  async searchOffers(p: SearchParams) {
    const q = `query Offers($keyword: String, $productCatId: Int, $sortType: Int, $page: Int, $limit: Int) {
      productOfferV2(keyword: $keyword, productCatId: $productCatId, sortType: $sortType, page: $page, limit: $limit) {
        nodes { ${OFFER_FIELDS} }
        pageInfo { page limit hasNextPage }
      }
    }`;
    const data = await this.query<{ productOfferV2: { nodes: Record<string, unknown>[]; pageInfo: { hasNextPage: boolean } } }>(q, {
      keyword: p.keyword,
      productCatId: p.productCatId,
      sortType: p.sortType ?? 1,
      page: p.page ?? 1,
      limit: p.limit ?? 20,
    });
    return {
      offers: data.productOfferV2.nodes.map(normalizeNode),
      hasNextPage: Boolean(data.productOfferV2.pageInfo?.hasNextPage),
    };
  }

  async getOfferByItemId(itemId: string): Promise<RawOffer | null> {
    const q = `query One($itemId: Int64) { productOfferV2(itemId: $itemId, limit: 1) { nodes { ${OFFER_FIELDS} } } }`;
    const data = await this.query<{ productOfferV2: { nodes: Record<string, unknown>[] } }>(q, { itemId });
    const n = data.productOfferV2.nodes[0];
    return n ? normalizeNode(n) : null;
  }

  async generateShortLink(originUrl: string, subIds: string[]): Promise<string> {
    const q = `mutation Link($originUrl: String!, $subIds: [String]) { generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) { shortLink } }`;
    const data = await this.query<{ generateShortLink: { shortLink: string } }>(q, { originUrl, subIds });
    return data.generateShortLink.shortLink;
  }

  /** Relatório de conversões (comissão efetivamente reportada pela plataforma). */
  async conversionReport(startUnix: number, endUnix: number) {
    const q = `query Conv($start: Int64, $end: Int64, $scrollId: String) {
      conversionReport(purchaseTimeStart: $start, purchaseTimeEnd: $end, limit: 500, scrollId: $scrollId) {
        nodes { conversionId purchaseTime totalCommission }
        pageInfo { hasNextPage scrollId }
      }
    }`;
    let scrollId: string | undefined;
    const nodes: Array<{ conversionId: string; purchaseTime: number; totalCommission: string }> = [];
    for (let i = 0; i < 20; i++) {
      const d = await this.query<{
        conversionReport: { nodes: typeof nodes; pageInfo: { hasNextPage: boolean; scrollId?: string } };
      }>(q, { start: startUnix, end: endUnix, scrollId });
      nodes.push(...d.conversionReport.nodes);
      if (!d.conversionReport.pageInfo.hasNextPage) break;
      scrollId = d.conversionReport.pageInfo.scrollId;
    }
    return nodes;
  }

  /** Verificação de conectividade + permissão: executa uma consulta mínima real. */
  async verify() {
    const started = Date.now();
    const r = await this.searchOffers({ keyword: "fone", limit: 1 });
    return { ok: true, latencyMs: Date.now() - started, sampleReturned: r.offers.length };
  }
}
