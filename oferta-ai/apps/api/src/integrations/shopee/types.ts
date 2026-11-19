/** Produto normalizado vindo da Shopee Affiliate Open API (ou do ambiente de testes). */
export interface RawOffer {
  externalId: string;
  shopId: string | null;
  name: string;
  shopName: string | null;
  /** shopType bruto (ex.: [1] Mall, [2] Star, [4] Star+); null se a API não informou */
  shopType: number[] | null;
  imageUrl: string | null;
  productLink: string | null;
  offerLink: string | null;
  priceMin: number | null;
  priceMax: number | null;
  /** Percentual de desconto informado pela plataforma (0–100) */
  priceDiscountRate: number | null;
  ratingStar: number | null;
  sales: number | null;
  /** Taxa de comissão (fração: 0.08 = 8%) */
  commissionRate: number | null;
  commission: number | null;
  periodEndTime: Date | null;
  /** Campos esperados que não vieram na resposta */
  unavailable: string[];
}

export interface SearchParams {
  keyword?: string;
  productCatId?: number;
  /** 1 relevância, 2 mais vendidos, 3 maior preço, 4 menor preço, 5 maior comissão */
  sortType?: 1 | 2 | 3 | 4 | 5;
  page?: number;
  limit?: number;
}

export interface OfferProvider {
  readonly source: "LIVE" | "SANDBOX";
  searchOffers(params: SearchParams): Promise<{ offers: RawOffer[]; hasNextPage: boolean }>;
  getOfferByItemId(itemId: string): Promise<RawOffer | null>;
  generateShortLink(originUrl: string, subIds: string[]): Promise<string>;
}
