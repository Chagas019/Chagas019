/** Utilitários de fuso horário (America/Sao_Paulo por padrão), sem dependências externas. */
const DEFAULT_TZ = process.env.TZ_APP || "America/Sao_Paulo";

function parts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, h: Number(p.hour), min: Number(p.minute) };
}

/** Data local YYYY-MM-DD. */
export function localDate(date = new Date(), tz = DEFAULT_TZ): string {
  const p = parts(date, tz);
  return `${p.y}-${p.m}-${p.d}`;
}

/** Minutos desde a meia-noite local. */
export function localMinutes(date = new Date(), tz = DEFAULT_TZ): number {
  const p = parts(date, tz);
  return p.h * 60 + p.min;
}

/** "08:30" -> 510 */
export function hhmmToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`horário inválido: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`horário inválido: ${hhmm}`);
  return h * 60 + min;
}

/** Instante UTC correspondente ao início do dia local. */
export function startOfLocalDay(date = new Date(), tz = DEFAULT_TZ): Date {
  const mins = localMinutes(date, tz);
  const d = new Date(date.getTime() - mins * 60_000);
  d.setUTCSeconds(0, 0);
  return d;
}
