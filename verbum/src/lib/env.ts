// Leitura centralizada da configuração. Chaves secretas só existem no servidor:
// este módulo nunca deve ser importado em componentes "use client" (veja o import "server-only").
import "server-only";

export const serverEnv = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiModel: process.env.VERBUM_AI_MODEL || "claude-opus-5-5",
  youtubeKey: process.env.YOUTUBE_API_KEY ?? "",
  freeAiLimit: Number(process.env.VERBUM_FREE_AI_LIMIT || 10),
};

export function integrationStatus() {
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ai: Boolean(serverEnv.anthropicKey),
    youtube: Boolean(serverEnv.youtubeKey),
  };
}
