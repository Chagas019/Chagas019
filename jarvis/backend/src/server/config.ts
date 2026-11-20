import { z } from "zod";

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optStr = z.preprocess(emptyToUndef, z.string().optional());

const EnvSchema = z.object({
  PORT: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(65535).default(8787)),
  NODE_ENV: z.preprocess(emptyToUndef, z.enum(["development", "test", "production"]).optional()),
  VERCEL: optStr,
  DATABASE_URL: optStr,
  SUPABASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SUPABASE_JWT_SECRET: optStr,
  JARVIS_DEV_TOKEN: optStr,
  JARVIS_OWNER_TOKEN: optStr,
  JARVIS_OWNER_ID: optStr,
  DATABASE_SCHEMA: optStr,
  JARVIS_ENCRYPTION_KEY: optStr,
  AI_DAILY_BUDGET_USD: z.preprocess(emptyToUndef, z.coerce.number().positive().default(1)),
  CORS_ORIGINS: optStr,
  RATE_LIMIT_PER_MIN: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).default(60)),
});

export interface Config {
  port: number;
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  /** Token de dev só vale com NODE_ENV explícito "development" ou "test". */
  devTokenAllowed: boolean;
  ownerToken?: string;
  ownerId: string;
  databaseSchema: string;
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseJwtSecret?: string;
  devToken?: string;
  /** 32 bytes decodificados de JARVIS_ENCRYPTION_KEY. */
  encryptionKey?: Buffer;
  dailyBudgetUsd: number;
  corsOrigins: string[];
  rateLimitPerMin: number;
}

/** Lê e valida variáveis de ambiente. Lança Error sem expor valores de segredos. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida: ${fields}`);
  }
  const e = parsed.data;
  // NODE_ENV ausente com sinais de deploy (DATABASE_URL ou VERCEL) => production (fail-closed). Sem sinais => development.
  const nodeEnv: Config["nodeEnv"] = e.NODE_ENV ?? (e.DATABASE_URL || e.VERCEL ? "production" : "development");
  const isProduction = nodeEnv === "production";
  const devTokenAllowed = e.NODE_ENV === "development" || e.NODE_ENV === "test";

  let encryptionKey: Buffer | undefined;
  if (e.JARVIS_ENCRYPTION_KEY) {
    const buf = Buffer.from(e.JARVIS_ENCRYPTION_KEY, "base64");
    if (buf.length !== 32) throw new Error("Configuração inválida: JARVIS_ENCRYPTION_KEY deve ter 32 bytes em base64.");
    encryptionKey = buf;
  } else if (isProduction) {
    throw new Error("Configuração inválida: JARVIS_ENCRYPTION_KEY é obrigatória em produção.");
  }
  if (e.JARVIS_OWNER_TOKEN && e.JARVIS_OWNER_TOKEN.length < 32) {
    throw new Error("Configuração inválida: JARVIS_OWNER_TOKEN deve ter ao menos 32 caracteres.");
  }
  const databaseSchema = e.DATABASE_SCHEMA ?? "public";
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(databaseSchema)) throw new Error("Configuração inválida: DATABASE_SCHEMA inválido.");
  if (isProduction && !e.SUPABASE_URL && !e.SUPABASE_JWT_SECRET && !e.JARVIS_OWNER_TOKEN) {
    throw new Error("Configuração inválida: defina SUPABASE_URL/SUPABASE_JWT_SECRET ou JARVIS_OWNER_TOKEN em produção.");
  }

  return {
    port: e.PORT,
    nodeEnv,
    isProduction,
    devTokenAllowed,
    databaseUrl: e.DATABASE_URL,
    supabaseUrl: e.SUPABASE_URL,
    supabaseJwtSecret: e.SUPABASE_JWT_SECRET,
    devToken: e.JARVIS_DEV_TOKEN,
    ownerToken: e.JARVIS_OWNER_TOKEN,
    ownerId: e.JARVIS_OWNER_ID ?? "owner",
    databaseSchema,
    encryptionKey,
    dailyBudgetUsd: e.AI_DAILY_BUDGET_USD,
    corsOrigins: (e.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    rateLimitPerMin: e.RATE_LIMIT_PER_MIN,
  };
}
