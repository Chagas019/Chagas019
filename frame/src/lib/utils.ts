import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Fuso padrão da interface (pt-BR). Preparado para virar preferência do usuário. */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "America/Sao_Paulo";

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function timeAgo(date: Date, now = new Date()): string {
  const diff = (date.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "agora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function mediaUrl(id: string, variant: "display" | "thumb" = "display"): string {
  return `/api/media/${id}${variant === "thumb" ? "?v=thumb" : ""}`;
}
