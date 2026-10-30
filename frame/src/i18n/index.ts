import { ptBR } from "./pt-BR";

/**
 * Internacionalização. Hoje só existe pt-BR; para adicionar um idioma, crie um dicionário
 * com o mesmo formato (o TypeScript exige todas as chaves) e registre em `dictionaries`.
 * Ainda há textos diretamente nos componentes — a migração para o dicionário é gradual.
 */
export type Dictionary = typeof ptBR;
export type Locale = "pt-BR";

const dictionaries: Record<Locale, Dictionary> = { "pt-BR": ptBR };

export const DEFAULT_LOCALE: Locale = "pt-BR";

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale];
}
