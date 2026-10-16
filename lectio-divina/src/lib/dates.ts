// Datas como texto "aaaa-mm-dd" no fuso de Brasília, para o dia virar à meia-noite do Brasil
// em qualquer aparelho. As contas usam UTC para não sofrer com fuso do navegador.

export const TZ = 'America/Sao_Paulo';

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

export function addMonths(iso: string, n: number): string {
  const d = toUTC(iso.slice(0, 7) + '-01');
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUTC(d);
}

/** Semanas do mês (domingo a sábado), com null nos dias fora do mês. */
export function monthGrid(isoInMonth: string): (string | null)[][] {
  const first = toUTC(isoInMonth.slice(0, 7) + '-01');
  const month = first.getUTCMonth();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (const d = new Date(first); d.getUTCMonth() === month; d.setUTCDate(d.getUTCDate() + 1)) {
    cells.push(fromUTC(d));
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opts }).format(toUTC(iso));

/** "sexta-feira, 16 de outubro de 2026" */
export const longDate = (iso: string) =>
  fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "outubro de 2026" */
export const monthLabel = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' });

/** "16 out" */
export const shortDate = (iso: string) =>
  fmt(iso, { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');

export const weekday = (iso: string) => fmt(iso, { weekday: 'long' });

/** Milissegundos até a próxima meia-noite de Brasília (Brasil sem horário de verão: UTC−3). */
export function msUntilNextDay(now: Date = new Date()): number {
  const tomorrow = addDays(todayISO(now), 1);
  const midnight = Date.parse(`${tomorrow}T00:00:00-03:00`);
  return Math.max(1000, midnight - now.getTime());
}
