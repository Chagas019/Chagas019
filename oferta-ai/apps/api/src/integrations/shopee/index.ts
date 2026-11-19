import { env } from "../../config/env";
import { resolveIntegration } from "../store";
import { ShopeeAffiliateClient } from "./client";
import { SandboxOfferProvider } from "./sandbox";
import type { OfferProvider } from "./types";

export class IntegrationNotConfiguredError extends Error {
  constructor(public readonly provider: string, public readonly missing: string[]) {
    super(`Integração ${provider} não configurada. Falta: ${missing.join(", ")}`);
  }
}

/** Retorna o provedor de ofertas. Em modo live, exige credenciais reais (nunca cai para dados fictícios). */
export async function getOfferProvider(): Promise<OfferProvider> {
  if (env.DATA_MODE === "sandbox") return new SandboxOfferProvider();
  const r = await resolveIntegration("SHOPEE_AFFILIATE");
  if (!r.configured) throw new IntegrationNotConfiguredError("SHOPEE_AFFILIATE", r.missing);
  return new ShopeeAffiliateClient(r.creds.appId, r.creds.appSecret, r.config.apiUrl);
}

export async function getLiveShopeeClient(): Promise<ShopeeAffiliateClient> {
  const r = await resolveIntegration("SHOPEE_AFFILIATE");
  if (!r.configured) throw new IntegrationNotConfiguredError("SHOPEE_AFFILIATE", r.missing);
  return new ShopeeAffiliateClient(r.creds.appId, r.creds.appSecret, r.config.apiUrl);
}

export * from "./types";
