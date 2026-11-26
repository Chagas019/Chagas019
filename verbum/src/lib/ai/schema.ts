import * as z from "zod/v4";

export const BriefSchema = z.object({
  tema: z.string().trim().min(3).max(200),
  publico: z.string().trim().max(120).default("Grupo de oração"),
  duracao: z.number().int().min(5).max(180).default(30),
  objetivo: z.string().trim().max(400).default(""),
  tipo: z.enum(["grupo-de-oracao", "encontro", "retiro", "formacao", "estudo-biblico", "catequese", "testemunho"]).default("grupo-de-oracao"),
  passagem: z.string().trim().max(60).optional().default(""),
});
export type Brief = z.infer<typeof BriefSchema>;

export const TIPO_LABEL: Record<Brief["tipo"], string> = {
  "grupo-de-oracao": "Grupo de oração",
  encontro: "Encontro",
  retiro: "Retiro",
  formacao: "Formação",
  "estudo-biblico": "Estudo bíblico",
  catequese: "Catequese",
  testemunho: "Testemunho",
};

// Formato que o modelo devolve (saída estruturada). IDs de documentos e músicas
// precisam vir do contexto fornecido; tudo é verificado depois em verify.ts.
export const OutlineSchema = z.object({
  titulo: z.string(),
  titulos_alternativos: z.array(z.string()),
  objetivo_central: z.string(),
  introducao: z.string(),
  fundamentacao_biblica: z.array(z.object({ referencia: z.string(), por_que: z.string() })),
  contextualizacao: z.string(),
  desenvolvimento: z.array(z.object({ topico: z.string(), conteudo: z.string(), referencias: z.array(z.string()) })),
  catecismo: z.array(z.object({ paragrafos: z.string(), como_usar: z.string() })),
  documentos: z.array(z.object({ id: z.string(), como_usar: z.string() })),
  santos: z.array(z.object({ nome: z.string(), como_usar: z.string() })),
  aplicacoes_praticas: z.array(z.string()),
  perguntas_reflexao: z.array(z.string()),
  conclusao: z.string(),
  musicas: z.array(z.object({ id: z.string(), momento: z.string(), por_que: z.string() })),
  avisos: z.array(z.string()),
});
export type RawOutline = z.infer<typeof OutlineSchema>;

export type VerifiedRef = { label: string; note: string; status: "verificada" | "capitulo" | "nao-verificada"; url: string | null; detail?: string };

export type SermonOutline = {
  brief: Brief;
  generatedAt: string;
  model: string;
  titulo: string;
  titulos_alternativos: string[];
  objetivo_central: string;
  introducao: string;
  fundamentacao_biblica: VerifiedRef[];
  contextualizacao: string;
  desenvolvimento: { topico: string; conteudo: string; referencias: VerifiedRef[] }[];
  catecismo: VerifiedRef[];
  documentos: VerifiedRef[];
  santos: VerifiedRef[];
  aplicacoes_praticas: string[];
  perguntas_reflexao: string[];
  conclusao: string;
  musicas: VerifiedRef[];
  avisos: string[];
};
