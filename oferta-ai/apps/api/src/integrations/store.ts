import { IntegrationProvider, Prisma } from "@prisma/client";
import { prisma } from "../lib/core";
import { decryptJson, encryptJson, mask } from "../lib/crypto";
import { env } from "../config/env";

/**
 * Resolve credenciais: valores salvos (criptografados) no painel têm prioridade;
 * se ausentes, usa variáveis de ambiente.
 */
export type Creds = Record<string, string>;

const ENV_CREDS: Record<IntegrationProvider, () => Creds> = {
  SHOPEE_AFFILIATE: () => ({ appId: env.SHOPEE_APP_ID, appSecret: env.SHOPEE_APP_SECRET }),
  WHATSAPP_CLOUD: () => ({ token: env.WHATSAPP_TOKEN }),
  TELEGRAM_BOT: () => ({ botToken: env.TELEGRAM_BOT_TOKEN }),
  ANTHROPIC: () => ({ apiKey: env.ANTHROPIC_API_KEY }),
};

const ENV_CONFIG: Record<IntegrationProvider, () => Record<string, string>> = {
  SHOPEE_AFFILIATE: () => ({ apiUrl: env.SHOPEE_API_URL, subId: env.SHOPEE_SUB_ID }),
  WHATSAPP_CLOUD: () => ({ phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, groupId: env.WHATSAPP_GROUP_ID, graphVersion: env.WHATSAPP_GRAPH_VERSION }),
  TELEGRAM_BOT: () => ({ chatId: env.TELEGRAM_CHAT_ID }),
  ANTHROPIC: () => ({ model: env.AI_MODEL, fallbackModels: env.AI_FALLBACK_MODELS }),
};

export const REQUIRED_CREDS: Record<IntegrationProvider, string[]> = {
  SHOPEE_AFFILIATE: ["appId", "appSecret"],
  WHATSAPP_CLOUD: ["token"],
  TELEGRAM_BOT: ["botToken"],
  ANTHROPIC: ["apiKey"],
};

export const REQUIRED_CONFIG: Record<IntegrationProvider, string[]> = {
  SHOPEE_AFFILIATE: ["apiUrl"],
  WHATSAPP_CLOUD: ["phoneNumberId", "groupId"],
  TELEGRAM_BOT: ["chatId"],
  ANTHROPIC: [],
};

function nonEmpty(o: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

export async function resolveIntegration(provider: IntegrationProvider) {
  const row = await prisma.integration.findUnique({ where: { provider } });
  const creds = { ...nonEmpty(ENV_CREDS[provider]()), ...nonEmpty(decryptJson(row?.encryptedCredentials) ?? {}) };
  const config = {
    ...nonEmpty(ENV_CONFIG[provider]()),
    ...nonEmpty(((row?.config as Record<string, string>) ?? {})),
  };
  const missing = [
    ...REQUIRED_CREDS[provider].filter((k) => !creds[k]),
    ...REQUIRED_CONFIG[provider].filter((k) => !config[k]),
  ];
  return { row, creds, config, missing, configured: missing.length === 0 };
}

export async function saveIntegration(
  provider: IntegrationProvider,
  input: { credentials?: Creds; config?: Record<string, string> },
) {
  const existing = await prisma.integration.findUnique({ where: { provider } });
  const prevCreds = decryptJson(existing?.encryptedCredentials) ?? {};
  const mergedCreds = { ...prevCreds, ...nonEmpty(input.credentials ?? {}) };
  const mergedConfig = { ...((existing?.config as Record<string, string>) ?? {}), ...(input.config ?? {}) };
  const data = {
    encryptedCredentials: Object.keys(mergedCreds).length ? encryptJson(mergedCreds) : null,
    config: mergedConfig as Prisma.InputJsonValue,
    // Qualquer alteração invalida a verificação anterior
    status: "CONFIGURED" as const,
    lastVerifiedAt: null,
    lastError: null,
  };
  return prisma.integration.upsert({ where: { provider }, create: { provider, ...data }, update: data });
}

/** Visão pública (sem segredos) para o frontend. */
export async function publicIntegration(provider: IntegrationProvider) {
  const r = await resolveIntegration(provider);
  const maskedCreds = Object.fromEntries(REQUIRED_CREDS[provider].map((k) => [k, mask(r.creds[k])]));
  return {
    provider,
    status: r.configured ? (r.row?.status === "VERIFIED" || r.row?.status === "ERROR" ? r.row.status : "CONFIGURED") : "NOT_CONFIGURED",
    configured: r.configured,
    missing: r.missing,
    credentials: maskedCreds,
    config: r.config,
    consentConfirmed: r.row?.consentConfirmed ?? false,
    consentAt: r.row?.consentAt ?? null,
    lastVerifiedAt: r.row?.lastVerifiedAt ?? null,
    lastVerification: r.row?.lastVerification ?? null,
    lastError: r.row?.lastError ?? null,
  };
}

export async function markVerification(provider: IntegrationProvider, ok: boolean, details: Record<string, unknown>, error?: string) {
  const data = {
    status: ok ? ("VERIFIED" as const) : ("ERROR" as const),
    lastVerifiedAt: new Date(),
    lastVerification: details as Prisma.InputJsonValue,
    lastError: error ?? null,
  };
  await prisma.integration.upsert({ where: { provider }, create: { provider, ...data }, update: data });
}
