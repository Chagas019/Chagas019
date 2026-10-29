import { z } from "zod";
import { CATEGORY_SLUGS, LAB_TOPIC_SLUGS, SPECIALTIES } from "./taxonomy";

const trimmed = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const required = (max: number, label: string) => trimmed(max).min(1, `${label} é obrigatório.`);

/** Apenas URLs http(s) — bloqueia javascript:, data: etc. */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .url("Informe uma URL válida.")
  .refine((u) => /^https?:\/\//i.test(u), "Use um link começando com http:// ou https://");

const optionalUrl = z.union([safeUrl, z.literal("")]).optional().transform((v) => (v ? v : null));

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(30, "Use no máximo 30 caracteres.")
  .regex(/^[a-z0-9_.]+$/, "Use apenas letras minúsculas, números, ponto e sublinhado.")
  .refine((h) => !RESERVED_HANDLES.has(h), "Este identificador está reservado.");

export const RESERVED_HANDLES = new Set([
  "admin", "api", "frame", "entrar", "cadastro", "configuracoes", "descobrir", "lab", "desafios",
  "comunidades", "publicar", "notificacoes", "moderacao", "salvos", "ai", "suporte", "ajuda",
]);

const tagList = (max: number, itemMax = 40) =>
  z.array(trimmed(itemMax).min(1)).max(max, `Selecione no máximo ${max}.`).default([]);

export const categoriesSchema = z.array(z.enum(CATEGORY_SLUGS)).max(5, "Escolha até 5 categorias.").default([]);

export const onboardingSchema = z.object({
  handle: handleSchema,
  displayName: required(60, "Nome"),
  interests: z.array(z.enum(CATEGORY_SLUGS)).min(1, "Escolha pelo menos um interesse.").max(12),
  specialties: z.array(z.enum(SPECIALTIES)).max(6).default([]),
});

export const profileSchema = z.object({
  handle: handleSchema,
  displayName: required(60, "Nome"),
  bio: trimmed(500).default(""),
  specialties: z.array(z.enum(SPECIALTIES)).max(6).default([]),
  interests: z.array(z.enum(CATEGORY_SLUGS)).max(12).default([]),
  location: trimmed(80).optional().transform((v) => (v ? v : null)),
  showLocation: z.boolean().default(false),
  links: z
    .array(z.object({ label: required(40, "Rótulo"), url: safeUrl }))
    .max(6, "Adicione no máximo 6 links.")
    .default([]),
  gear: trimmed(500).default(""),
  tools: tagList(12),
  availableForWork: z.boolean().default(false),
  contactEmail: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]).optional().transform((v) => (v ? v : null)),
  contactVisibility: z.enum(["nobody", "members", "following"]).default("nobody"),
  isIndexable: z.boolean().default(false),
  autoApproveFollowers: z.boolean().default(false),
  accentColor: z.enum(["violet", "blue", "ember", "mint"]).default("violet"),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const notificationPrefsSchema = z.object({
  follow: z.boolean(),
  comment: z.boolean(),
  reply: z.boolean(),
  like: z.boolean(),
  challenge: z.boolean(),
  community: z.boolean(),
});

export const showcaseSchema = z.object({
  process: trimmed(4000).default(""),
  camera: trimmed(120).default(""),
  lens: trimmed(120).default(""),
  lighting: trimmed(300).default(""),
  software: tagList(8),
  presetName: trimmed(120).default(""),
  editParams: trimmed(2000).default(""),
  credits: z.array(z.object({ name: required(80, "Nome"), role: required(60, "Função") })).max(12).default([]),
  portfolioUrl: optionalUrl,
  hideTechnical: z.boolean().default(false),
});

export const tutorialSchema = z.object({
  topic: z.enum(LAB_TOPIC_SLUGS),
  level: z.enum(["iniciante", "intermediario", "avancado"]),
  durationMinutes: z.coerce.number().int().min(1, "Informe o tempo estimado.").max(600),
  software: trimmed(80).default(""),
  steps: z
    .array(z.object({ title: required(120, "Título da etapa"), body: trimmed(3000).default("") }))
    .min(1, "Adicione pelo menos uma etapa.")
    .max(30),
  resources: z.array(z.object({ label: required(80, "Rótulo"), url: safeUrl })).max(10).default([]),
});

export const postSchema = z
  .object({
    kind: z.enum(["work", "showcase", "tutorial", "discussion"]).default("work"),
    format: z.enum([
      "photo", "carousel", "video", "before_after", "making_of", "breakdown",
      "project", "lighting_study", "behind_the_scenes", "text",
    ]),
    title: required(140, "Título"),
    body: trimmed(5000).default(""),
    categories: categoriesSchema,
    tools: tagList(10),
    visibility: z.enum(["public", "followers", "private"]).default("public"),
    isCollaborative: z.boolean().default(false),
    communityId: z.string().uuid().nullable().default(null),
    alts: z.array(trimmed(300)).max(10).default([]),
    showcase: showcaseSchema.optional(),
    tutorial: tutorialSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "tutorial" && !v.tutorial) ctx.addIssue({ code: "custom", path: ["tutorial"], message: "Preencha os dados do tutorial." });
    if (v.kind === "showcase" && !v.showcase) ctx.addIssue({ code: "custom", path: ["showcase"], message: "Preencha os dados do Showcase." });
  });
export type PostInput = z.input<typeof postSchema>;

export const commentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().default(null),
  body: required(2000, "Comentário"),
});

export const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "user", "community"]),
  targetId: z.string().min(1).max(100),
  reason: z.enum(["spam", "harassment", "hate", "nudity", "violence", "copyright", "fraud", "impersonation", "other"]),
  details: trimmed(2000).default(""),
}).superRefine((v, ctx) => {
  if (v.reason === "copyright" && v.details.length < 20) {
    ctx.addIssue({ code: "custom", path: ["details"], message: "Descreva a obra original e onde ela foi publicada (mín. 20 caracteres)." });
  }
});

export const communitySchema = z.object({
  name: required(80, "Nome"),
  description: trimmed(1000).default(""),
  rules: trimmed(3000).default(""),
  categories: categoriesSchema,
  access: z.enum(["public", "private", "invite"]),
});

export const collectionSchema = z.object({
  name: required(60, "Nome"),
  description: trimmed(300).default(""),
  isPublic: z.boolean().default(false),
});

export const challengeSchema = z
  .object({
    title: required(120, "Título"),
    theme: required(160, "Tema"),
    briefing: required(4000, "Briefing"),
    rules: z.array(required(300, "Regra")).min(1).max(12),
    category: z.enum(CATEGORY_SLUGS),
    level: z.enum(["iniciante", "profissional", "todos"]),
    cadence: z.enum(["semanal", "mensal"]),
    palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(5).default([]),
    startsAt: z.coerce.date(),
    submissionDeadline: z.coerce.date(),
    votingEnabled: z.boolean(),
    votingEndsAt: z.coerce.date().nullable(),
    communityId: z.string().uuid().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.submissionDeadline <= v.startsAt) ctx.addIssue({ code: "custom", path: ["submissionDeadline"], message: "O encerramento deve ser depois do início." });
    if (v.votingEnabled && (!v.votingEndsAt || v.votingEndsAt <= v.submissionDeadline))
      ctx.addIssue({ code: "custom", path: ["votingEndsAt"], message: "A votação deve terminar depois do prazo de envio." });
  });

/** Converte erros do Zod em mapa campo → mensagem. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
