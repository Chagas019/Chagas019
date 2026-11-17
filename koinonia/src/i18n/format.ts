import { ptBR } from "./messages/pt-BR";
import { en } from "./messages/en";
import { es } from "./messages/es";
import type { Messages } from "./types";
import type { Locale, LocalizedNames } from "@/types/database";

type Dict = { [key: string]: string | Dict };

function deepMerge(base: Dict, override: Dict | undefined): Dict {
  if (!override) return base;
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = base[k];
    out[k] = typeof v === "object" && typeof b === "object" ? deepMerge(b, v) : v;
  }
  return out;
}

const cache = new Map<Locale, Messages>();

/** Dicionário completo do idioma, com fallback para pt-BR em chaves ausentes. */
export function messagesFor(locale: Locale): Messages {
  const hit = cache.get(locale);
  if (hit) return hit;
  const overrides = { "pt-BR": undefined, en, es }[locale] as Dict | undefined;
  const merged = deepMerge(ptBR as unknown as Dict, overrides) as unknown as Messages;
  cache.set(locale, merged);
  return merged;
}

/** Interpola {variaveis} em uma mensagem. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Nome traduzido de itens do catálogo (talentos/categorias), com fallback para pt-BR. */
export function localizedName(names: LocalizedNames, locale: Locale): string {
  return names[locale] ?? names["pt-BR"];
}
