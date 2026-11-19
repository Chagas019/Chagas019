import { hhmmToMinutes } from "../../lib/time";

/** Regras de programação (funções puras, testáveis). */
export function windowLength(start: string, end: string): number {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  return e > s ? e - s : 24 * 60 - s + e; // suporta janela que cruza a meia-noite
}

export function inWindow(nowMin: number, start: string, end: string): boolean {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  if (s === e) return true; // 24h
  return e > s ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e;
}

/** Intervalo efetivo: distribui a meta ao longo da janela, respeitando o mínimo configurado. */
export function effectiveIntervalMinutes(start: string, end: string, dailyGoal: number, minInterval: number): number {
  return Math.max(minInterval, Math.floor(windowLength(start, end) / Math.max(1, dailyGoal)));
}

export interface ScheduleState {
  nowMin: number;
  now: Date;
  lastPublishedAt: Date | null;
  publishedToday: number;
  settings: {
    publishWindowStart: string;
    publishWindowEnd: string;
    dailyGoal: number;
    dailyLimit: number;
    minIntervalMinutes: number;
    systemHalted: boolean;
    publishingPaused: boolean;
  };
}

export type ScheduleDecision = { ok: true; intervalMin: number } | { ok: false; reason: string; intervalMin: number };

export function canPublishNow(st: ScheduleState): ScheduleDecision {
  const s = st.settings;
  const intervalMin = effectiveIntervalMinutes(s.publishWindowStart, s.publishWindowEnd, s.dailyGoal, s.minIntervalMinutes);
  if (s.systemHalted) return { ok: false, reason: "STOP ALL ativo", intervalMin };
  if (s.publishingPaused) return { ok: false, reason: "publicação pausada (circuit breaker ou manual)", intervalMin };
  if (!inWindow(st.nowMin, s.publishWindowStart, s.publishWindowEnd)) return { ok: false, reason: "fora da janela de publicação", intervalMin };
  if (st.publishedToday >= s.dailyLimit) return { ok: false, reason: "limite diário atingido", intervalMin };
  if (st.lastPublishedAt) {
    const elapsed = (st.now.getTime() - st.lastPublishedAt.getTime()) / 60_000;
    if (elapsed < intervalMin) return { ok: false, reason: `aguardando intervalo (${Math.ceil(intervalMin - elapsed)} min)`, intervalMin };
  }
  return { ok: true, intervalMin };
}
