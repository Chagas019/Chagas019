/** Utilitários de fuso horário sem dependências (Intl). */

export function zonedParts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: weekdayMap[p.weekday as string] ?? 0,
  };
}

/** Converte data local (YYYY-MM-DD) + hora (HH:MM) no fuso `tz` para um Date UTC. */
export function zonedToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Ajuste iterativo do offset (cobre horário de verão).
  let ts = guess;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(ts), tz);
    const [py, pm, pd] = p.date.split('-').map(Number);
    const asUtc = Date.UTC(py, pm - 1, pd, p.hour, p.minute);
    ts += guess - asUtc;
  }
  return new Date(ts);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function todayIn(tz: string, now = new Date()) {
  return zonedParts(now, tz).date;
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
