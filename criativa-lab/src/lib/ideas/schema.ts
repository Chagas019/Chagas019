import { z } from "zod";

export const CATEGORY_IDS = ["fotografia", "design", "video", "direcao-de-arte", "social", "tipografia", "livre"] as const;

export const IdeaRequestSchema = z.object({
  what: z.string().trim().min(2, "Descreva o que deseja criar.").max(160),
  category: z.enum(CATEGORY_IDS),
  style: z.string().trim().min(2).max(60),
  audience: z.string().trim().min(2).max(80),
  difficulty: z.enum(["iniciante", "intermediario", "avancado"]),
  extra: z.string().trim().max(400).optional(),
});

/** Formato que a IA deve devolver (validado por structured outputs). */
export const IdeaOutputSchema = z.object({
  title: z.string(),
  concept: z.string(),
  ideas: z.array(z.string()),
  artDirection: z.string(),
  references: z.array(z.string()),
  palette: z.array(z.object({ name: z.string(), hex: z.string() })),
  execution: z.array(z.string()),
  script: z.array(z.string()).nullable(),
});

export type IdeaOutput = z.infer<typeof IdeaOutputSchema>;
