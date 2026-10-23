'use client';

import { backoffDelay, gradeConnection, summarizeRtt, type ConnectionGrade } from '@nexus/core';
import { useEffect, useRef, useState } from 'react';

export interface ConnectionState {
  grade: ConnectionGrade | 'medindo';
  rttMs: number | null;
  jitterMs: number | null;
  /** Banda estimada pelo navegador (Network Information API, só Chromium). */
  downlinkMbps: number | null;
  /** Tentativa de reconexão em andamento (0 = conectado). */
  attempt: number;
  retryInMs: number | null;
}

const WINDOW = 5;
const INTERVAL_MS = 5000;
const TIMEOUT_MS = 4000;

/**
 * Mede a conexão com o servidor web do NEXUS (rota /api/health).
 *
 * Isso é real, mas mede apenas o caminho até o servidor web, não até um
 * servidor de jogo — que ainda não existe. Na Fase 4 a mesma interface
 * passa a ler as estatísticas do WebRTC (RTT, jitter e perda de pacotes).
 *
 * Em falha, entra em reconexão com backoff exponencial; ao voltar a rede
 * (evento `online`) ou a aba ficar visível, tenta de novo na hora.
 */
export function useConnection(enabled = true): ConnectionState {
  const [state, setState] = useState<ConnectionState>({
    grade: 'medindo', rttMs: null, jitterMs: null, downlinkMbps: null, attempt: 0, retryInMs: null,
  });
  const samples = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;
    let inflight = false;

    const downlink = () => {
      const c = (navigator as Navigator & { connection?: { downlink?: number } }).connection;
      return typeof c?.downlink === 'number' ? c.downlink : null;
    };

    async function probe() {
      if (stopped || inflight) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') return; // retoma em visibilitychange
      inflight = true;
      const ctrl = new AbortController();
      const abort = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const t0 = performance.now();
      try {
        const res = await fetch(`/api/health?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const rtt = performance.now() - t0;
        samples.current = [...samples.current, rtt].slice(-WINDOW);
        const s = summarizeRtt(samples.current)!;
        attempt = 0;
        if (!stopped) {
          setState({ grade: gradeConnection({ rttMs: s.avg, jitterMs: s.jitter }), rttMs: s.avg, jitterMs: s.jitter, downlinkMbps: downlink(), attempt: 0, retryInMs: null });
          timer = setTimeout(probe, INTERVAL_MS);
        }
      } catch {
        samples.current = [];
        attempt += 1;
        const wait = backoffDelay(attempt - 1);
        if (!stopped) {
          setState((s) => ({ ...s, grade: 'offline', rttMs: null, jitterMs: null, attempt, retryInMs: wait }));
          timer = setTimeout(probe, wait);
        }
      } finally {
        inflight = false;
        clearTimeout(abort);
      }
    }

    const now = () => void probe();
    window.addEventListener('online', now);
    document.addEventListener('visibilitychange', now);
    probe();
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', now);
      document.removeEventListener('visibilitychange', now);
    };
  }, [enabled]);

  return state;
}
