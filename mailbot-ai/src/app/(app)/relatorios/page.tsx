import Link from 'next/link';
import { ReportButton } from '@/components/ReportButton';
import { Empty } from '@/components/Empty';
import { pageContext } from '@/lib/server/queries';
import { localDate } from '@/lib/agents/time';
import { CATEGORY_LABEL } from '@/lib/ui/format';
import type { ReportContent, ReportItem } from '@/lib/agents/summary';

export const dynamic = 'force-dynamic';

function Section({ title, items, render }: { title: string; items: ReportItem[]; render?: (i: ReportItem) => string }) {
  return (
    <div className="card enter">
      <h2 className="card-title">{title}<span className="faint">{items.length}</span></h2>
      {items.length ? (
        <ul className="list-plain">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/mensagens/${i.id}`} className="stack" style={{ gap: 3 }}>
                <span className="row between" style={{ gap: 8 }}><span style={{ fontWeight: 500 }}>{i.summary}</span><span className={`badge p-${i.priority}`}>{i.priority}</span></span>
                <span className="tiny faint">{i.from}{render ? ` · ${render(i)}` : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="small faint" style={{ margin: 0 }}>Nada identificado.</p>}
    </div>
  );
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ k?: string; d?: string }> }) {
  const sp = await searchParams;
  const kind = sp.k === 'weekly' ? 'weekly' : 'daily';
  const { sb, tz, account } = await pageContext();
  const [{ data: reports }, { data: usage }] = await Promise.all([
    sb.from('daily_reports').select('id,period_start,period_end,narrative,content,email_count,model,created_at').eq('kind', kind).order('period_start', { ascending: false }).limit(30),
    sb.from('ai_usage').select('agent,input_tokens,output_tokens,cost_usd').gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
  ]);
  const list = reports ?? [];
  const current = list.find((r) => r.period_start === sp.d) ?? list[0];
  const c = current?.content as ReportContent | undefined;
  const today = localDate(new Date(), tz);
  const hasToday = list.some((r) => (kind === 'daily' ? r.period_start === today : r.period_end === today));

  const byAgent = new Map<string, { tokens: number; cost: number; calls: number }>();
  for (const u of usage ?? []) {
    const a = byAgent.get(u.agent) ?? { tokens: 0, cost: 0, calls: 0 };
    byAgent.set(u.agent, { tokens: a.tokens + u.input_tokens + u.output_tokens, cost: a.cost + Number(u.cost_usd), calls: a.calls + 1 });
  }
  const catTotal = c ? Object.values(c.by_category).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="page">
      <div className="topbar"><h1>Relatórios</h1>{account?.status === 'connected' && <ReportButton kind={kind} label={hasToday ? 'Atualizar' : 'Gerar agora'} force={hasToday} />}</div>
      <nav className="chips">
        <Link href="/relatorios?k=daily" className="chip" aria-current={kind === 'daily' ? 'true' : undefined}>Resumo diário</Link>
        <Link href="/relatorios?k=weekly" className="chip" aria-current={kind === 'weekly' ? 'true' : undefined}>Resumo semanal</Link>
      </nav>

      {!current || !c ? (
        <Empty title="Nenhum relatório ainda" text="Os resumos são gerados automaticamente no horário configurado, ou agora pelo botão acima." />
      ) : (
        <div className="stack">
          {list.length > 1 && (
            <nav className="chips" aria-label="Períodos">
              {list.slice(0, 14).map((r) => <Link key={r.id} href={`/relatorios?k=${kind}&d=${r.period_start}`} className="chip" aria-current={r.id === current.id ? 'true' : undefined}>{kind === 'daily' ? r.period_start.slice(5).split('-').reverse().join('/') : `${r.period_start.slice(5).split('-').reverse().join('/')}–${r.period_end.slice(5).split('-').reverse().join('/')}`}</Link>)}
            </nav>
          )}
          <div className="card enter">
            <h2 className="card-title">{kind === 'daily' ? `Dia ${current.period_start}` : `${current.period_start} a ${current.period_end}`}<span className="faint">{current.model ? 'IA' : 'automático'}</span></h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{current.narrative}</p>
          </div>
          <div className="grid grid-4">
            <div className="stat"><b>{c.stats.received}</b><span>Mensagens recebidas</span></div>
            <div className="stat"><b>{c.stats.important}</b><span>Importantes</span></div>
            <div className="stat"><b>{c.needs_reply.length}</b><span>Pendências de resposta</span></div>
            <div className="stat"><b>{c.appointments.length}</b><span>Compromissos</span></div>
          </div>
          <Section title="Mais importantes" items={c.top} />
          <Section title="Pendências — precisam de resposta" items={c.needs_reply} render={(i) => i.action} />
          <Section title="Respostas aguardadas" items={c.awaiting_reply} render={(i) => i.action} />
          <Section title="Prazos próximos" items={c.deadlines} render={(i) => `prazo ${i.deadline}`} />
          <Section title="Compromissos identificados" items={c.appointments} render={(i) => (i.appointment_at ? new Date(i.appointment_at).toLocaleString('pt-BR', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' }) : i.action)} />
          <Section title="Cobranças e pagamentos" items={c.bills} render={(i) => [i.amount, i.deadline && `vence ${i.deadline}`].filter(Boolean).join(' · ')} />
          <Section title="Acompanhar" items={c.follow_up} />
          {catTotal > 0 && (
            <div className="card enter">
              <h2 className="card-title">Mensagens por categoria</h2>
              <div className="stack" style={{ gap: 10 }}>
                {Object.entries(c.by_category).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k}><div className="row between small"><span>{CATEGORY_LABEL[k] ?? k}</span><span className="faint">{v}</span></div><div className="bar"><i style={{ width: `${(v / catTotal) * 100}%` }} /></div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="section">
        <div className="section-head"><h2>Consumo de IA (30 dias)</h2></div>
        <div className="card">
          {byAgent.size ? (
            <ul className="list-plain">
              {['triage', 'summary', 'chat'].map((a) => {
                const v = byAgent.get(a) ?? { tokens: 0, cost: 0, calls: 0 };
                return <li key={a} className="row between small"><span>{a === 'triage' ? 'Mail Triage' : a === 'summary' ? 'Mail Summary' : 'Mail Chat'}</span><span className="faint">{v.calls} chamadas · {v.tokens.toLocaleString('pt-BR')} tokens · US$ {v.cost.toFixed(4)}</span></li>;
              })}
            </ul>
          ) : <p className="small faint" style={{ margin: 0 }}>Nenhum consumo registrado.</p>}
        </div>
      </section>
    </div>
  );
}
