import { z } from 'zod';
import path from 'node:path';

/**
 * Todas as credenciais e segredos vêm EXCLUSIVAMENTE de variáveis de ambiente.
 * Nada sensível é gravado no código ou no banco em texto puro.
 */
const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  TZ_APP: z.string().default('America/Sao_Paulo'),

  DATABASE_PATH: z.string().default('./storage/social-ai.db'),
  STORAGE_DIR: z.string().default('./storage'),
  BACKUP_DIR: z.string().default('./backups'),

  /** URL pública HTTPS do servidor. A Graph API baixa as mídias por URL pública. */
  PUBLIC_BASE_URL: z.string().default(''),

  /** 32 bytes em base64 — criptografa tokens OAuth no banco (AES-256-GCM). */
  ENCRYPTION_KEY: z.string().default(''),
  /** Segredo de assinatura das sessões administrativas. */
  SESSION_SECRET: z.string().default(''),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  // Claude (Anthropic) — cérebro dos agentes
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  ANTHROPIC_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('high'),

  // Meta / Instagram Graph API oficial
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v24.0'),
  META_GRAPH_HOST: z.string().default('https://graph.facebook.com'),
  /** Opcional: token de longa duração já emitido (alternativa ao fluxo OAuth). */
  IG_ACCESS_TOKEN: z.string().optional(),
  IG_USER_ID: z.string().optional(),

  // Geração de imagens (opcional)
  IMAGE_GEN_PROVIDER: z.enum(['none', 'openai']).default('none'),
  IMAGE_GEN_API_KEY: z.string().optional(),
  IMAGE_GEN_MODEL: z.string().default('gpt-image-1'),

  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),

  /**
   * Trava de segurança de nível de infraestrutura. Mesmo com o "modo de produção"
   * ligado no painel, NADA é publicado se esta variável não for "true".
   */
  ALLOW_PUBLISHING: bool.default(false),

  WORKER_ENABLED: bool.default(true),
  SCHEDULER_ENABLED: bool.default(true),
  LOG_LEVEL: z.string().default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(overrides: Partial<Record<keyof Env, unknown>> = {}): Env {
  const parsed = EnvSchema.parse({ ...process.env, ...overrides });
  if (parsed.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!parsed.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
    if (!parsed.SESSION_SECRET || parsed.SESSION_SECRET.length < 32) missing.push('SESSION_SECRET (>=32 chars)');
    if (missing.length) throw new Error(`Variáveis obrigatórias em produção ausentes: ${missing.join(', ')}`);
  }
  cached = parsed;
  return parsed;
}

export function env(): Env {
  return cached ?? loadEnv();
}

export function resetEnvCache() {
  cached = null;
}

export function storagePath(...parts: string[]) {
  return path.resolve(env().STORAGE_DIR, ...parts);
}
