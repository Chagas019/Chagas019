export const PAGE_SIZE = 12;

export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

export function pageRange(page: number, size = PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

/** Escapa curingas para filtros ILIKE e remove caracteres com significado na sintaxe do PostgREST. */
export function sanitizeSearch(value: string | string[] | undefined): string {
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  return raw.replace(/[%_\\(),.*:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
