/** Alocação determinística de pilares/formatos do calendário editorial (sem LLM — testável). */
export type Format = 'REELS' | 'CAROUSEL' | 'IMAGE' | 'STORIES';
export interface Pillar { key: string; label: string; weight: number; formats?: Format[] }
export interface PlannedSlot { date: string; slot: string; format: Format; pillar: string; time: string }

export const PILLAR_FORMATS: Record<string, Format[]> = {
  reel_educativo: ['REELS'],
  tutorial: ['REELS', 'CAROUSEL'],
  carrossel: ['CAROUSEL'],
  dica_rapida: ['REELS', 'IMAGE'],
  bastidores: ['REELS', 'IMAGE'],
  fotografia: ['IMAGE', 'CAROUSEL', 'REELS'],
  aplicativos: ['REELS', 'CAROUSEL'],
  tendencias: ['REELS', 'IMAGE', 'CAROUSEL'],
  autoridade: ['CAROUSEL', 'IMAGE'],
  interacao: ['IMAGE', 'CAROUSEL'],
};
const DEFAULT_STORY_PILLARS = ['interacao', 'bastidores', 'dica_rapida'];
const formatsOf = (p: Pillar): Format[] => p.formats ?? PILLAR_FORMATS[p.key] ?? ['REELS', 'CAROUSEL', 'IMAGE'];

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function allocateCalendar(o: {
  startDate: string; days: number; pillars: Pillar[];
  reelsPerDay: number; feedPerDay: number;
  times: { reel: string; feed: string; stories: string[] };
  /** Último pilar usado por slot antes do início (para continuidade). */
  previous?: Record<string, string>;
  startIndex?: number;
  storyPillars?: string[];
}): PlannedSlot[] {
  const storyPillars = o.storyPillars?.length ? o.storyPillars : DEFAULT_STORY_PILLARS;
  const out: PlannedSlot[] = [];
  const usage: Record<string, number> = Object.fromEntries(o.pillars.map((p) => [p.key, 0]));
  const totalWeight = o.pillars.reduce((a, p) => a + p.weight, 0) || 1;
  const prevBySlot: Record<string, string> = { ...(o.previous ?? {}) };
  let prevDayPillars = new Set<string>(Object.values(prevBySlot));
  let assigned = 0;

  const pick = (format: Format, slot: string, todays: Set<string>) => {
    const candidates = o.pillars
      .filter((p) => formatsOf(p).includes(format))
      .filter((p) => !todays.has(p.key) && !prevDayPillars.has(p.key) && prevBySlot[slot] !== p.key);
    const pool = candidates.length
      ? candidates
      : o.pillars.filter((p) => !todays.has(p.key) && prevBySlot[slot] !== p.key && formatsOf(p).includes(format));
    const fallback = pool.length ? pool : o.pillars;
    // Escolhe o pilar mais "atrasado" em relação ao peso desejado.
    let best = fallback[0];
    let bestDeficit = -Infinity;
    for (const p of fallback) {
      const target = (p.weight / totalWeight) * (assigned + 1);
      const deficit = target - usage[p.key];
      if (deficit > bestDeficit) (best = p), (bestDeficit = deficit);
    }
    usage[best.key] = (usage[best.key] ?? 0) + 1;
    assigned++;
    return best.key;
  };

  for (let d = 0; d < o.days; d++) {
    const date = addDays(o.startDate, d);
    const todays = new Set<string>();
    const dayIndex = (o.startIndex ?? 0) + d;
    for (let r = 0; r < o.reelsPerDay; r++) {
      const slot = r === 0 ? 'reel' : `reel_${r + 1}`;
      const pillar = pick('REELS', slot, todays);
      todays.add(pillar);
      out.push({ date, slot, format: 'REELS', pillar, time: o.times.reel });
    }
    for (let f = 0; f < o.feedPerDay; f++) {
      const slot = f === 0 ? 'feed' : `feed_${f + 1}`;
      const format: Format = (dayIndex + f) % 2 === 0 ? 'CAROUSEL' : 'IMAGE';
      const pillar = pick(format, slot, todays);
      todays.add(pillar);
      out.push({ date, slot, format, pillar, time: o.times.feed });
    }
    out.push({ date, slot: 'stories', format: 'STORIES', pillar: storyPillars[dayIndex % storyPillars.length], time: o.times.stories[0] ?? '09:30' });
    for (const s of out.filter((x) => x.date === date && x.format !== 'STORIES')) prevBySlot[s.slot] = s.pillar;
    prevDayPillars = todays;
  }
  return out;
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'para', 'com', 'um', 'uma', 'seu', 'sua', 'como', 'que', 'por']);
export function themeTokens(t: string) {
  return new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
}
export function themeSimilarity(a: string, b: string) {
  const A = themeTokens(a);
  const B = themeTokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Retorna pares (dia, dia+1) com temas parecidos demais (assunto repetido em dias consecutivos). */
export function findConsecutiveRepeats(items: { date: string; slot: string; theme: string; pillar: string }[], threshold = 0.5) {
  const byDate = new Map<string, typeof items>();
  for (const i of items) byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
  const dates = [...byDate.keys()].sort();
  const conflicts: { a: (typeof items)[0]; b: (typeof items)[0]; similarity: number }[] = [];
  for (let k = 1; k < dates.length; k++) {
    for (const a of byDate.get(dates[k - 1])!) {
      for (const b of byDate.get(dates[k])!) {
        if (a.slot === 'stories' || b.slot === 'stories') continue;
        const s = themeSimilarity(a.theme, b.theme);
        if (s >= threshold) conflicts.push({ a, b, similarity: s });
      }
    }
  }
  return conflicts;
}
