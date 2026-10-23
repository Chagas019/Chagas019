'use client';

import { Activity, Globe, Lock, Radio, Server } from 'lucide-react';
import type { ReactNode } from 'react';
import { useConnection } from '@/lib/connection';
import { ConnectionBars, connectionText } from './ConnectionIndicator';

type Tone = 'ok' | 'bad' | 'pending';

function Row({ icon, name, detail, tone, status }: { icon: ReactNode; name: string; detail: string; tone: Tone; status: ReactNode }) {
  const dot = { ok: 'bg-ok shadow-[0_0_10px_var(--color-ok)]', bad: 'bg-bad', pending: 'bg-warn/70' }[tone];
  return (
    <li className="flex items-center gap-4 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white/5 text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{name}</span>
        <span className="block text-xs text-faint">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-right text-sm">
        {status}
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      </span>
    </li>
  );
}

/**
 * Painel de disponibilidade. Só a primeira linha é medida de verdade (o
 * servidor web que entrega esta página). As demais mostram o estado real de
 * implantação de cada componente — nenhum valor de carga é inventado.
 */
export function ServiceStatus() {
  const c = useConnection();
  const webOk = c.grade !== 'offline' && c.grade !== 'medindo';
  return (
    <div className="panel px-5 sm:px-6" role="region" aria-label="Disponibilidade do serviço">
      <ul className="divide-y divide-line">
        <Row
          icon={<Globe className="h-5 w-5" aria-hidden="true" />}
          name="Site e catálogo"
          detail="Medido agora a partir do seu aparelho"
          tone={webOk ? 'ok' : c.grade === 'medindo' ? 'pending' : 'bad'}
          status={<><ConnectionBars state={c} /><span className="hidden sm:inline">{connectionText(c)}</span><span className="sm:hidden">{webOk ? `${c.rttMs} ms` : connectionText(c).split(' ·')[0]}</span></>}
        />
        <Row icon={<Lock className="h-5 w-5" aria-hidden="true" />} name="Contas e API" detail="Cadastro, login e biblioteca na nuvem" tone="pending" status={<span className="text-muted">Fase 3</span>} />
        <Row icon={<Radio className="h-5 w-5" aria-hidden="true" />} name="Streaming WebRTC" detail="Transmissão de vídeo e controles" tone="pending" status={<span className="text-muted">Fase 4</span>} />
        <Row icon={<Server className="h-5 w-5" aria-hidden="true" />} name="Servidores de jogo" detail="Máquinas com GPU para executar os jogos" tone="pending" status={<span className="text-muted">0 ativos</span>} />
        <Row icon={<Activity className="h-5 w-5" aria-hidden="true" />} name="Fila de espera" detail="Entra em uso quando houver capacidade limitada" tone="pending" status={<span className="text-muted">Inativa</span>} />
      </ul>
    </div>
  );
}
