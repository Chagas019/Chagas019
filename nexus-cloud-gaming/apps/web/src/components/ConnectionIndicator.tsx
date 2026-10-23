'use client';

import { GRADE_LABEL } from '@nexus/core';
import { WifiOff } from 'lucide-react';
import { useConnection, type ConnectionState } from '@/lib/connection';

const COLOR = {
  excelente: 'text-ok',
  boa: 'text-ok',
  instavel: 'text-warn',
  ruim: 'text-bad',
  offline: 'text-bad',
  medindo: 'text-muted',
};

const BARS = { excelente: 4, boa: 3, instavel: 2, ruim: 1, offline: 0, medindo: 0 };

export function ConnectionBars({ state }: { state: ConnectionState }) {
  const n = BARS[state.grade];
  return (
    <span className={`flex items-end gap-0.5 ${COLOR[state.grade]}`} aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`w-1 rounded-sm ${i <= n ? 'bg-current' : 'bg-white/15'}`} style={{ height: `${4 + i * 3}px` }} />
      ))}
    </span>
  );
}

export function connectionText(s: ConnectionState) {
  if (s.grade === 'medindo') return 'Medindo…';
  if (s.grade === 'offline') {
    return s.retryInMs !== null ? `Sem conexão · nova tentativa em ${Math.ceil(s.retryInMs / 1000)} s` : 'Sem conexão';
  }
  return `${GRADE_LABEL[s.grade]} · ${s.rttMs} ms`;
}

/** Selo compacto com a qualidade medida até o servidor web. */
export function ConnectionIndicator({ state: external }: { state?: ConnectionState }) {
  const own = useConnection(!external);
  const s = external ?? own;
  return (
    <span className="chip gap-2" role="status" aria-live="polite" title="Tempo de ida e volta até o servidor web do NEXUS">
      {s.grade === 'offline' ? <WifiOff className="h-3.5 w-3.5 text-bad" aria-hidden="true" /> : null}
      <ConnectionBars state={s} />
      <span>{connectionText(s)}</span>
    </span>
  );
}
