import { z } from "zod";

/**
 * Variáveis de ambiente validadas na inicialização.
 * Credenciais de integrações podem vir do .env OU do painel (salvas criptografadas no banco).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter ao menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  /** Chave AES-256 em base64 (32 bytes). Gere com: openssl rand -base64 32 */
  ENCRYPTION_KEY: z.string().min(40),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /** URL pública da API, usada no redirecionador de cliques /r/:code (opcional) */
  PUBLIC_BASE_URL: z.string().optional().default(""),
  TZ_APP: z.string().default("America/Sao_Paulo"),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
  ADMIN_NAME: z.string().default("Administrador"),

  /** live = Shopee real | sandbox = ambiente de testes com produtos fictícios (nunca publica) */
  DATA_MODE: z.enum(["live", "sandbox"]).default("sandbox"),

  SHOPEE_APP_ID: z.string().optional().default(""),
  SHOPEE_APP_SECRET: z.string().optional().default(""),
  SHOPEE_API_URL: z.string().default("https://open-api.affiliate.shopee.com.br/graphql"),
  SHOPEE_SUB_ID: z.string().default("ofertaai"),

  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  AI_FALLBACK_MODELS: z.string().default("claude-sonnet-5-5,claude-haiku-5-5"),
  AI_EFFORT: z.enum(["low", "medium", "high"]).default("low"),

  WHATSAPP_GRAPH_VERSION: z.string().default("v23.0"),
  WHATSAPP_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_GROUP_ID: z.string().optional().default(""),

  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional().default(""),

  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuração inválida:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();
export const isSandbox = () => env.DATA_MODE === "sandbox";
