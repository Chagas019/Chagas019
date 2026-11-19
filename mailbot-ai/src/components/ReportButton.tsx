'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ReportButton({ kind, label, force = false }: { kind: 'daily' | 'weekly'; label: string; force?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function run() {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, force }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao gerar'); } finally { setBusy(false); }
  }
  return (
    <span className="stack" style={{ gap: 6, alignItems: 'flex-start' }}>
      <button className="btn btn-sm" onClick={run} disabled={busy}>{busy ? 'Gerando…' : label}</button>
      {err && <span className="tiny" style={{ color: '#ff8a80' }}>{err}</span>}
    </span>
  );
}
