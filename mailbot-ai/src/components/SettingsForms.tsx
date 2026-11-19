'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Erro');
  return data;
}

const list = (s: string) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

export interface PrefsValue {
  timezone: string; sync_frequency_minutes: number; daily_report_hour: number; initial_sync_days: number;
  vip_senders: string[]; work_domains: string[]; ignored_senders: string[]; ai_daily_budget_usd: number;
}

export function PreferencesForm({ initial }: { initial: PrefsValue }) {
  const router = useRouter();
  const [v, setV] = useState({ ...initial, vip: initial.vip_senders.join(', '), work: initial.work_domains.join(', '), ignored: initial.ignored_senders.join(', ') });
  const [state, setState] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setState(null);
    try {
      await call('/api/preferences', 'PATCH', {
        timezone: v.timezone, sync_frequency_minutes: Number(v.sync_frequency_minutes), daily_report_hour: Number(v.daily_report_hour),
        initial_sync_days: Number(v.initial_sync_days), ai_daily_budget_usd: Number(v.ai_daily_budget_usd),
        vip_senders: list(v.vip), work_domains: list(v.work), ignored_senders: list(v.ignored),
      });
      setState({ kind: 'ok', text: 'Preferências salvas.' });
      router.refresh();
    } catch (err) { setState({ kind: 'err', text: err instanceof Error ? err.message : 'Erro' }); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <div className="card enter enter-2">
        <h2 className="card-title">Sincronização e resumo diário</h2>
        <div className="grid grid-2">
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="freq">Frequência de sincronização</label>
            <select id="freq" className="select" value={v.sync_frequency_minutes} onChange={(e) => setV({ ...v, sync_frequency_minutes: Number(e.target.value) })}>
              <option value={15}>A cada 15 min</option><option value={30}>A cada 30 min</option><option value={60}>A cada hora</option>
              <option value={180}>A cada 3 horas</option><option value={360}>A cada 6 horas</option><option value={720}>A cada 12 horas</option>
              <option value={1440}>Uma vez por dia</option><option value={0}>Somente manual</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="hour">Horário do resumo diário</label>
            <select id="hour" className="select" value={v.daily_report_hour} onChange={(e) => setV({ ...v, daily_report_hour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="days">Período da sincronização inicial</label>
            <select id="days" className="select" value={v.initial_sync_days} onChange={(e) => setV({ ...v, initial_sync_days: Number(e.target.value) })}>
              <option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Último ano</option><option value={0}>Todas as mensagens</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="tz">Fuso horário</label>
            <input id="tz" className="input" value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card enter enter-3">
        <h2 className="card-title">Preferências de classificação</h2>
        <div className="field"><label className="label" htmlFor="vip">Remetentes VIP (e-mails ou domínios)</label>
          <textarea id="vip" className="input" value={v.vip} onChange={(e) => setV({ ...v, vip: e.target.value })} placeholder="chefe@empresa.com, @cliente.com.br" /></div>
        <div className="field"><label className="label" htmlFor="work">Domínios de trabalho</label>
          <textarea id="work" className="input" value={v.work} onChange={(e) => setV({ ...v, work: e.target.value })} placeholder="empresa.com" /></div>
        <div className="field"><label className="label" htmlFor="ign">Remetentes para ignorar</label>
          <textarea id="ign" className="input" value={v.ignored} onChange={(e) => setV({ ...v, ignored: e.target.value })} placeholder="ofertas@loja.com" /></div>
        <div className="field"><label className="label" htmlFor="budget">Limite diário de uso de IA (US$)</label>
          <input id="budget" className="input" type="number" min={0} max={50} step={0.05} value={v.ai_daily_budget_usd} onChange={(e) => setV({ ...v, ai_daily_budget_usd: Number(e.target.value) })} /></div>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar preferências'}</button>
        {state && <span role="status" className="small" style={{ color: state.kind === 'ok' ? '#6ee7a0' : '#ff8a80' }}>{state.text}</span>}
      </div>
    </form>
  );
}

export function DisconnectGmail() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleteData, setDeleteData] = useState(false);
  async function go() {
    if (!confirm(deleteData ? 'Desconectar o Gmail e APAGAR todos os e-mails sincronizados e relatórios?' : 'Desconectar o Gmail? Os dados já sincronizados serão mantidos.')) return;
    setBusy(true);
    try { await call('/api/gmail/disconnect', 'POST', { deleteData }); router.refresh(); } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); } finally { setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="row small muted"><input type="checkbox" checked={deleteData} onChange={(e) => setDeleteData(e.target.checked)} /> Também apagar os dados sincronizados</label>
      <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={go} disabled={busy}>{busy ? 'Desconectando…' : 'Desconectar Gmail'}</button>
    </div>
  );
}

export function DeleteAccount() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true); setErr('');
    try {
      await call('/api/account', 'DELETE', { confirm: text });
      window.location.href = '/login?excluido=1';
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro'); setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>Apaga definitivamente sua conta, e-mails sincronizados, classificações, conversas, relatórios e tokens, e revoga o acesso ao Gmail. Digite <b>EXCLUIR</b> para confirmar.</p>
      <div className="row wrap">
        <input className="input" style={{ maxWidth: 220 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Confirmação" placeholder="EXCLUIR" />
        <button className="btn btn-danger btn-sm" onClick={go} disabled={busy || text !== 'EXCLUIR'}>{busy ? 'Excluindo…' : 'Excluir meus dados'}</button>
      </div>
      {err && <span className="tiny" style={{ color: '#ff8a80' }}>{err}</span>}
    </div>
  );
}
