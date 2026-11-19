import { useState } from 'react';
import { api, Badge, Bars, Card, fmtDate, fmtDateTime, fmtNum, fmtPct, FORMAT_LABEL, Kpi, LineChart, Loading, Page, useAction, useApi } from '../lib';

const AGENT_ICON: Record<string, string> = { trend_scout: '🔭', strategist: '🧭', copywriter: '✍️', creative_studio: '🎬', publisher: '📤', analyst: '📊' };

export function Dashboard() {
  const { data, error, reload } = useApi<any>('/api/dashboard', [], 10000);
  const { run, busy } = useAction();
  if (!data) return <Loading error={error} />;
  const a = data.analytics;
  return (
    <Page
      title="Visão geral"
      subtitle={data.account ? `@${data.account.username} · ${data.account.niche ?? 'nicho não confirmado'}` : 'Nenhuma conta do Instagram conectada'}
      actions={
        <>
          <button className="btn" disabled={busy} onClick={() => run(() => api('/api/pipeline/run', { method: 'POST', body: {} }), 'Pipeline do dia enfileirado').then(reload)}>▶ Rodar pipeline agora</button>
          {data.flags.publishing_paused ? (
            <button className="btn primary" disabled={busy} onClick={() => run(() => api('/api/emergency/resume', { method: 'POST', body: {} }), 'Publicações retomadas').then(reload)}>Retomar publicações</button>
          ) : (
            <button className="btn danger" disabled={busy} onClick={() => confirm('Pausar TODAS as publicações agora?') && run(() => api('/api/emergency/pause', { method: 'POST', body: { reason: 'painel' } }), 'Publicações pausadas').then(reload)}>⏻ Pausa de emergência</button>
          )}
        </>
      }
    >
      <div className="grid" style={{ gap: 16 }}>
        <ModeBanner flags={data.flags} />
        <div className="grid g6">
          <Kpi label="Em produção" value={data.counts.inProduction} sub={`${data.counts.awaitingReview} aguardando revisão`} />
          <Kpi label="Agendados" value={data.counts.scheduled} />
          <Kpi label="Publicados" value={data.counts.published} sub={data.counts.blocked ? `${data.counts.blocked} bloqueados/falhos` : 'sem bloqueios'} />
          <Kpi label="Alcance (30d)" value={fmtNum(a.totals.reach)} sub={`${a.posts} posts medidos`} />
          <Kpi label="Engajamento (30d)" value={fmtPct(a.engagementRate)} sub="interações / alcance" />
          <Kpi label="Crescimento (30d)" value={a.growth == null ? '—' : `${a.growth >= 0 ? '+' : ''}${fmtNum(a.growth)}`} sub={data.account ? `${fmtNum(data.account.followers)} seguidores` : 'sem conta'} />
        </div>

        <div className="grid g3">
          <Card title="Agentes" className="span2">
            <div className="grid g3">
              {data.agents.map((ag: any) => (
                <div key={ag.key} className="item agent" style={{ alignItems: 'start', display: 'grid' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="name">{AGENT_ICON[ag.key]} {ag.name}</span>
                    <Badge s={ag.enabled ? ag.status : 'paused'} />
                  </div>
                  <span className="dim small">{ag.role}</span>
                  <span className="small muted">Última execução: {fmtDateTime(ag.last_run_at)}</span>
                  {ag.last_error && <span className="small" style={{ color: 'var(--red)' }}>{ag.last_error.slice(0, 120)}</span>}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Próxima publicação">
            {data.next ? (
              <div className="grid" style={{ gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtDateTime(data.next.scheduled_at)}</div>
                <div>{data.next.title}</div>
                <Badge s="scheduled" label={FORMAT_LABEL[data.next.media_type]} />
              </div>
            ) : <div className="empty">Nada agendado.</div>}
          </Card>
        </div>

        <div className="grid g2">
          <Card title={`Rotina de hoje · ${fmtDate(data.today)}`}>
            <div className="timeline">
              {data.routine.map((s: any) => {
                const st = s.job?.status;
                const cls = st === 'done' ? 'done' : st === 'running' || st === 'queued' ? 'running' : st === 'dead' ? 'dead' : '';
                return (
                  <div key={s.key} className="step">
                    <span className="mono dim">{s.time}</span>
                    <span className={`dot ${cls}`} />
                    <span>{s.label}{s.job?.last_error && <div className="small" style={{ color: 'var(--red)' }}>{s.job.last_error.slice(0, 140)}</div>}</span>
                    {st ? <Badge s={st} /> : <span className="dim small">aguardando</span>}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Publicações de hoje">
            {data.todayPubs.length ? (
              <div className="list">
                {data.todayPubs.map((p: any) => (
                  <div key={p.id} className="item">
                    <div><div>{p.title}</div><div className="dim small">{FORMAT_LABEL[p.media_type]} · {fmtDateTime(p.scheduled_at)}</div></div>
                    <div className="row">{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer">ver</a>}<Badge s={p.status} /></div>
                  </div>
                ))}
              </div>
            ) : <div className="empty">Nenhuma publicação hoje.</div>}
          </Card>
        </div>

        <Card title="Alcance por dia (30 dias, dados reais da API)">
          <LineChart series={a.series.map((s: any) => ({ x: s.day.slice(5), y: s.reach }))} label={fmtNum} />
        </Card>
      </div>
    </Page>
  );
}

export function ModeBanner({ flags }: { flags: any }) {
  if (flags.publishing_paused) return <div className="alert err">⏻ Publicações PAUSADAS pelo botão de emergência. Nada será publicado até retomar.</div>;
  if (!flags.production_mode || !flags.allow_env)
    return <div className="alert warn">Modo de desenvolvimento: o sistema pesquisa, planeja e cria, mas <b>não publica</b>. {!flags.allow_env && 'ALLOW_PUBLISHING está desligado no servidor. '}Ative o modo de produção em Integrações após conectar a conta e confirmar permissões.</div>;
  return <div className="alert ok">Modo de produção ativo — publicações automáticas habilitadas{flags.require_human_approval ? ' (com aprovação humana)' : ''}.</div>;
}

export function Trends() {
  const [date, setDate] = useState<string | null>(null);
  const { data, error } = useApi<any>(`/api/trends${date ? `?date=${date}` : ''}`, [date]);
  const { run, busy } = useAction();
  if (!data) return <Loading error={error} />;
  const rep = data.report?.data ?? {};
  return (
    <Page title="Pesquisa de tendências" subtitle="Trend Scout · fontes oficiais (Graph API) e pesquisa web pública — padrões, nunca cópias"
      actions={<>
        <select value={data.date} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }}>{[data.date, ...data.dates.filter((d: string) => d !== data.date)].map((d: string) => <option key={d}>{d}</option>)}</select>
        <button className="btn primary" disabled={busy} onClick={() => run(() => api('/api/agents/run', { method: 'POST', body: { type: 'trend_scout.research' } }), 'Pesquisa enfileirada')}>Pesquisar agora</button>
      </>}>
      <div className="grid" style={{ gap: 16 }}>
        {data.report ? (
          <div className="grid g3">
            <Card title="Relatório do dia" className="span2">
              <p style={{ marginTop: 0 }}>{data.report.summary}</p>
              {rep.limitations && <div className="alert warn small">Limitações: {rep.limitations}</div>}
              {rep.opportunities?.length > 0 && <><h3 style={{ margin: '14px 0 8px' }}>Oportunidades</h3><ul>{rep.opportunities.map((o: string) => <li key={o}>{o}</li>)}</ul></>}
            </Card>
            <Card title="Ranking de oportunidades">
              {rep.ranked_opportunities?.length ? <Bars items={rep.ranked_opportunities.slice(0, 8).map((r: any) => ({ label: r.title, value: r.score, note: FORMAT_LABEL[r.format] }))} /> : <div className="empty">Análise das 07:00 ainda não executada.</div>}
              {rep.apps?.length > 0 && <><h3 style={{ margin: '14px 0 8px' }}>Apps em destaque</h3><div className="row">{rep.apps.map((a: string) => <span key={a} className="badge violet">{a}</span>)}</div></>}
            </Card>
          </div>
        ) : <div className="empty">Nenhum relatório ainda. A pesquisa roda automaticamente às 06:00.</div>}
        <div className="grid g2">
          {data.trends.map((t: any) => (
            <Card key={t.id} className="hover" title={<div><h2>{t.title}</h2><div className="dim small">{t.topic} · {t.source}</div></div>} actions={<><Badge s="x" label={FORMAT_LABEL[t.format] ?? t.format} /><span className={`badge ${t.momentum === 'rising' ? 'green' : t.momentum === 'declining' ? 'red' : ''}`}>{t.momentum === 'rising' ? 'em alta' : t.momentum === 'declining' ? 'em queda' : 'estável'}</span></>}>
              <p className="muted" style={{ marginTop: 0 }}>{t.summary}</p>
              <table><tbody>
                <tr><td className="dim">Gancho</td><td>{t.hook_pattern}</td></tr>
                <tr><td className="dim">Estrutura</td><td>{t.narrative_structure}</td></tr>
                {t.duration_seconds && <tr><td className="dim">Duração</td><td>{t.duration_seconds}s</td></tr>}
                <tr><td className="dim">Estilo visual</td><td>{t.visual_style}</td></tr>
                <tr><td className="dim">CTA</td><td>{t.cta_pattern}</td></tr>
                <tr><td className="dim">Evidência</td><td className="small">{t.engagement_signal?.evidence}</td></tr>
              </tbody></table>
              <div style={{ marginTop: 10 }}><div className="row small" style={{ justifyContent: 'space-between' }}><span className="dim">Potencial de adaptação</span><b>{t.adaptation_potential}</b></div><div className="bar"><i style={{ width: `${t.adaptation_potential}%` }} /></div></div>
              {t.reference_urls?.length > 0 && <div className="small" style={{ marginTop: 8 }}>{t.reference_urls.map((u: string) => <div key={u}><a href={u} target="_blank" rel="noreferrer">{u.slice(0, 70)}</a></div>)}</div>}
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}

export function Analytics() {
  const [days, setDays] = useState(30);
  const { data, error } = useApi<any>(`/api/analytics?days=${days}`, [days]);
  const reports = useApi<any[]>('/api/reports');
  if (!data) return <Loading error={error} />;
  const t = data.totals;
  const lastWeekly = reports.data?.find((r) => r.type === 'weekly');
  const lastDaily = reports.data?.find((r) => r.type === 'daily');
  const recs = (lastWeekly ?? lastDaily)?.data?.recommendations ?? [];
  return (
    <Page title="Analytics" subtitle="Métricas reais coletadas pela API oficial — correlação não é causalidade"
      actions={<select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 140 }}>{[7, 30, 90].map((d) => <option key={d} value={d}>{d} dias</option>)}</select>}>
      <div className="grid" style={{ gap: 16 }}>
        <div className="grid g6">
          <Kpi label="Alcance" value={fmtNum(t.reach)} />
          <Kpi label="Visualizações" value={fmtNum(t.views)} />
          <Kpi label="Curtidas" value={fmtNum(t.likes)} />
          <Kpi label="Comentários" value={fmtNum(t.comments)} />
          <Kpi label="Compartilhamentos" value={fmtNum(t.shares)} />
          <Kpi label="Salvamentos" value={fmtNum(t.saved)} />
        </div>
        <div className="grid g2">
          <Card title="Alcance"><LineChart series={data.series.map((s: any) => ({ x: s.day.slice(5), y: s.reach }))} label={fmtNum} /></Card>
          <Card title="Seguidores"><LineChart color="var(--green)" series={data.followers.map((s: any) => ({ x: s.date.slice(5), y: s.followers_count ?? 0 }))} label={fmtNum} /></Card>
        </div>
        <div className="grid g3">
          <Card title="Top 5 conteúdos" className="span2">
            {data.top5.length ? <div className="table-wrap"><table>
              <thead><tr><th>#</th><th>Conteúdo</th><th>Formato</th><th>Alcance</th><th>Salv.</th><th>Comp.</th><th>Taxa</th></tr></thead>
              <tbody>{data.top5.map((r: any, i: number) => <tr key={r.publication_id}><td>{i + 1}</td><td>{r.permalink ? <a href={r.permalink} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</td><td>{FORMAT_LABEL[r.media_type]}</td><td>{fmtNum(r.reach)}</td><td>{r.saved}</td><td>{r.shares}</td><td>{fmtPct(r.engagement_rate)}</td></tr>)}</tbody>
            </table></div> : <div className="empty">Ainda sem publicações medidas.</div>}
          </Card>
          <Card title="Por formato">
            <Bars items={data.byFormat.map((f: any) => ({ label: FORMAT_LABEL[f.group] ?? f.group, value: f.avgEngagementRate, note: `n=${f.n} · confiança ${f.confidence}` }))} format={fmtPct} />
          </Card>
        </div>
        <div className="grid g2">
          <Card title="Por pilar editorial"><Bars items={data.byPillar.map((f: any) => ({ label: f.group, value: f.avgEngagementRate, note: `n=${f.n}` }))} format={fmtPct} /></Card>
          <Card title="Recomendações do Analyst → Strategist">
            {recs.length ? <div className="list">{recs.map((r: any, i: number) => <div key={i} className="item" style={{ display: 'grid' }}><b>{r.hypothesis}</b><span className="muted small">{r.action}</span><span className="dim small">Evidência: {r.evidence} · confiança {r.confidence}</span></div>)}</div> : <div className="empty">Sem recomendações ainda.</div>}
          </Card>
        </div>
        <Card title="Relatórios">
          {reports.data?.length ? <div className="list">{reports.data.filter((r) => r.type !== 'trends').map((r) => <details key={r.id} className="item" style={{ display: 'block' }}><summary><b>{r.type === 'weekly' ? 'Semanal' : 'Diário'}</b> · {r.period_start} → {r.period_end}</summary><p className="muted">{r.summary}</p>{r.data?.caveats && <div className="alert warn small">{r.data.caveats}</div>}</details>)}</div> : <div className="empty">Relatórios são gerados todas as noites.</div>}
        </Card>
      </div>
    </Page>
  );
}
