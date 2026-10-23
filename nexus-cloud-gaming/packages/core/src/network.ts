import type { StreamQuality } from './types';

export type ConnectionGrade = 'excelente' | 'boa' | 'instavel' | 'ruim' | 'offline';

export interface ConnectionSample {
  /** Tempo de ida e volta medido, em ms. `null` quando a medição falhou. */
  rttMs: number | null;
  jitterMs?: number;
  /** Perda de pacotes em %, disponível quando houver WebRTC (Fase 4). */
  lossPct?: number;
}

export const GRADE_LABEL: Record<ConnectionGrade, string> = {
  excelente: 'Excelente',
  boa: 'Boa',
  instavel: 'Instável',
  ruim: 'Ruim',
  offline: 'Sem conexão',
};

/**
 * Limites usados para classificar a conexão. São metas de projeto para
 * jogos de ação, a serem recalibradas com as medições reais da Fase 4.
 */
export function gradeConnection({ rttMs, jitterMs = 0, lossPct = 0 }: ConnectionSample): ConnectionGrade {
  if (rttMs === null || !Number.isFinite(rttMs)) return 'offline';
  if (rttMs <= 40 && jitterMs <= 10 && lossPct < 0.5) return 'excelente';
  if (rttMs <= 80 && jitterMs <= 20 && lossPct < 1.5) return 'boa';
  if (rttMs <= 150 && jitterMs <= 40 && lossPct < 4) return 'instavel';
  return 'ruim';
}

/** Qualidade sugerida para o modo automático. */
export function recommendQuality(grade: ConnectionGrade, downlinkMbps?: number): StreamQuality | null {
  if (grade === 'offline') return null;
  const byGrade: Record<Exclude<ConnectionGrade, 'offline'>, StreamQuality> = {
    excelente: '1080p60',
    boa: '1080p60',
    instavel: '720p60',
    ruim: '720p30',
  };
  let q = byGrade[grade];
  if (downlinkMbps !== undefined) {
    if (downlinkMbps < 8) q = '720p30';
    else if (downlinkMbps < 15 && q === '1080p60') q = '720p60';
  }
  return q;
}

/**
 * Atraso de reconexão com backoff exponencial e jitter ("full jitter").
 * `random` é injetável para testes.
 */
export function backoffDelay(attempt: number, baseMs = 500, maxMs = 8000, random: () => number = Math.random): number {
  const cap = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(cap * (0.5 + random() * 0.5));
}

/** Média e jitter (desvio médio entre amostras consecutivas) de uma série de RTTs. */
export function summarizeRtt(samples: number[]): { avg: number; jitter: number } | null {
  if (samples.length === 0) return null;
  const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
  let diff = 0;
  for (let i = 1; i < samples.length; i++) diff += Math.abs(samples[i] - samples[i - 1]);
  const jitter = samples.length > 1 ? diff / (samples.length - 1) : 0;
  return { avg: Math.round(avg), jitter: Math.round(jitter) };
}
