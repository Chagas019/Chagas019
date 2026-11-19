'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconSync } from './Icons';

/** Dispara a sincronização (retomável) e repete enquanto houver mensagens a buscar/classificar. */
export function SyncButton({ auto = false, compact = false }: { auto?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const started = useRef(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setMsg({ kind: 'info', text: 'Sincronizando com o Gmail…' });
    let added = 0; let classified = 0;
    try {
      for (let round = 0; round < 25; round++) {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Falha na sincronização');
        added += data.sync?.added ?? 0;
        classified += data.triage?.classified ?? 0;
        setMsg({ kind: 'info', text: `Sincronizando… ${added} novas, ${classified} analisadas` });
        if (data.triage?.budgetExceeded) { setMsg({ kind: 'err', text: 'Limite diário de IA atingido — o restante será analisado depois.' }); break; }
        if (!data.hasMore) { setMsg({ kind: 'ok', text: `Pronto: ${added} novas mensagens, ${classified} analisadas.` }); break; }
        router.refresh();
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Falha na sincronização' });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  useEffect(() => {
    if (auto && !started.current) { started.current = true; void run(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button className={compact ? 'icon-btn' : 'btn btn-ghost btn-sm'} onClick={run} disabled={busy} aria-label="Sincronizar agora" title="Sincronizar agora">
        <IconSync className={busy ? 'spin' : undefined} />{!compact && (busy ? 'Sincronizando' : 'Sincronizar')}
      </button>
      {msg && !compact && <span role="status" className={`tiny ${msg.kind === 'err' ? '' : 'muted'}`} style={msg.kind === 'err' ? { color: '#ff8a80' } : undefined}>{msg.text}</span>}
      {msg && compact && <span role="status" className="sr-only">{msg.text}</span>}
    </div>
  );
}
