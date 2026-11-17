import type { Locale } from "@/types/database";

export const locales: readonly Locale[] = ["pt-BR", "en", "es"] as const;
export const defaultLocale: Locale = "pt-BR";
export const LOCALE_COOKIE = "koinonia_locale";
export const localeNames: Record<Locale, string> = { "pt-BR": "Português (Brasil)", en: "English", es: "Español" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
