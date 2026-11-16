import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Gera slug ASCII a partir de um nome (acentos removidos). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Aceita apenas caminhos relativos internos para redirecionamento (evita open redirect).
 * Rejeita caracteres de controle e barras invertidas (o parser de URL remove \t\n e converte \ em /,
 * o que transformaria "/\t/evil.com" em "//evil.com") e confirma que a origem não muda.
 */
export function safeRedirectPath(value: unknown, fallback = "/painel"): string {
  if (typeof value !== "string" || value.length > 2048) return fallback;
  if (!value.startsWith("/") || /[\u0000-\u001F\u007F\\]/.test(value)) return fallback;
  const base = "https://koinonia.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
