import { z } from "zod";
import { prisma } from "./core";

/** Configuração operacional (persistida na tabela Setting, editável no painel). */
export const settingsSchema = z.object({
  dailyGoal: z.number().int().min(1).max(200).default(30),
  dailyLimit: z.number().int().min(1).max(300).default(30),
  minScore: z.number().min(0).max(100).default(75),
  researchIntervalMinutes: z.number().int().min(15).max(1440).default(120),
  publishWindowStart: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  publishWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  /** Intervalo mínimo entre publicações (minutos). O intervalo efetivo é max(min, janela/meta). */
  minIntervalMinutes: z.number().int().min(1).max(600).default(15),
  /** Somente pode ficar true após validação de credenciais, permissões, consentimento e conectividade. */
  autoPublish: z.boolean().default(false),
  /** Canal principal: whatsapp_cloud | telegram | manual */
  primaryChannel: z.enum(["whatsapp_cloud", "telegram", "manual"]).default("manual"),
  enabledCategories: z.array(z.string()).default([]),
  /** Janela de deduplicação: não republicar o mesmo produto por N dias */
  dedupDays: z.number().int().min(1).max(90).default(7),
  /** Máximo de produtos de uma mesma categoria por dia (variedade) */
  maxPerCategoryPerDay: z.number().int().min(1).max(100).default(6),
  /** Variação máxima de preço aceita entre aprovação e publicação (%) */
  maxPriceDriftPct: z.number().min(0).max(100).default(5),
  minStoreScore: z.number().min(0).max(15).default(5),
  circuitBreakerThreshold: z.number().int().min(1).max(20).default(3),
  maxRetries: z.number().int().min(0).max(10).default(3),
  productsPerKeyword: z.number().int().min(5).max(50).default(20),
  keywordsPerCycle: z.number().int().min(1).max(30).default(6),
  /** Flags de controle */
  systemHalted: z.boolean().default(false),
  publishingPaused: z.boolean().default(false),
  publishingPausedReason: z.string().nullable().default(null),
});

export type Settings = z.infer<typeof settingsSchema>;
const KEY = "operational";

export async function getSettings(): Promise<Settings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return settingsSchema.parse(row?.value ?? {});
}

export async function updateSettings(patch: Partial<Settings>, by = "system"): Promise<Settings> {
  const current = await getSettings();
  const next = settingsSchema.parse({ ...current, ...patch });
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next, updatedBy: by },
    update: { value: next, updatedBy: by },
  });
  return next;
}
