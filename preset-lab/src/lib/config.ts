import "server-only";

/**
 * Configuração do servidor. Decide o backend de dados e o provedor de pagamentos.
 *
 * DATA_BACKEND:
 *  - "supabase" (produção): Supabase Auth + Postgres (RLS) + Storage.
 *  - "local" (desenvolvimento/demonstração): arquivo JSON em .data/ e arquivos em disco.
 *    É bloqueado em produção, a menos que ALLOW_LOCAL_DEMO=true (usado só nos testes E2E).
 *
 * PAYMENTS_PROVIDER:
 *  - "mercadopago": checkout real (exige MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET).
 *  - "dev": checkout SIMULADO de desenvolvimento, claramente identificado. Bloqueado em produção.
 */

const isProd = process.env.NODE_ENV === "production";

function backend(): "supabase" | "local" {
  const explicit = process.env.DATA_BACKEND;
  if (explicit === "supabase" || explicit === "local") return explicit;
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "local";
}

function paymentsProvider(): "mercadopago" | "dev" {
  const explicit = process.env.PAYMENTS_PROVIDER;
  if (explicit === "mercadopago" || explicit === "dev") return explicit;
  return process.env.MP_ACCESS_TOKEN ? "mercadopago" : "dev";
}

export const config = {
  get isProd() {
    return isProd;
  },
  get backend() {
    return backend();
  },
  get allowLocalDemo() {
    return process.env.ALLOW_LOCAL_DEMO === "true";
  },
  get payments() {
    return paymentsProvider();
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  },
  get supabaseServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  },
  get mpAccessToken() {
    return process.env.MP_ACCESS_TOKEN || "";
  },
  get mpWebhookSecret() {
    return process.env.MP_WEBHOOK_SECRET || "";
  },
  /** Segredo para assinar tokens locais (sessões e links de download no modo local). */
  get appSecret() {
    const s = process.env.APP_SECRET;
    if (s && s.length >= 32) return s;
    if (isProd && !this.allowLocalDemo) throw new Error("APP_SECRET ausente ou curto (mínimo 32 caracteres).");
    return "dev-only-insecure-secret-change-me-0123456789";
  },
  /** Duração das URLs assinadas de download, em segundos. */
  downloadUrlTtl: 60,
};

/** Garante que a combinação de configuração é segura para o ambiente atual. */
export function assertSafeConfig() {
  if (!isProd) return;
  if (config.backend === "local" && !config.allowLocalDemo) {
    throw new Error("DATA_BACKEND=local não é permitido em produção. Configure o Supabase (veja docs/SUPABASE.md).");
  }
  if (config.payments === "dev" && !config.allowLocalDemo) {
    throw new Error("O checkout simulado (PAYMENTS_PROVIDER=dev) não é permitido em produção. Configure o Mercado Pago.");
  }
  if (config.backend === "supabase" && !config.supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
  }
}

export const isDemoMode = () => config.backend === "local" || config.payments === "dev";
