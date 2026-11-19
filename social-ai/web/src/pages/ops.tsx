import { useState } from 'react';
import { api, Badge, Card, fmtDateTime, fmtNum, FORMAT_LABEL, Loading, Page, useAction, useApi } from '../lib';

export function Scheduling() {
  const { data, error, reload } = useApi<any[]>('/api/publications', [], 15000);
  const { run, busy } = useAction();
  const [pre, setPre] = useState<Record<number, any>>({});
  if (!data) return <Loading error={error} />;
  const queue = data.filter((p) => ['scheduled', 'retrying', 'publishing', 'blocked', 'failed'].includes(p.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const check = async (id: number) => setPre({ ...pre, [id]: await api(`/api/publications/${id}/preflight`) });
  return (
    <Page title="Agendamento" subtitle="Fila de publicação · toda publicação passa pelas travas de segurança antes de sair">
      {!queue.length ? <div className="empty">Nada na fila. Aprove conteúdos na Central de criação.</div> : (
        <div className="list">
          {queue.map((p) => (
            <Card key={p.id} title={<div><h2>{p.title}</h2><div className="dim small">#{p.id} · {FORMAT_LABEL[p.media_type]} · {fmtDateTime(p.scheduled_at)} · tentativas {p.attempts}</div></div>} actions={<Badge s={p.status} />}>
              {p.block_reasons?.length > 0 && <div className="alert err small" style={{ marginBottom: 10 }}>{p.block_reasons.map((r: string) => <div key={r}>• {r}</div>)}</div>}
              {p.last_error && <div className="alert warn small" style={{ marginBottom: 10 }}>Último erro: {p.last_error}</div>}
              {pre[p.id] && <div className={`alert ${pre[p.id].ok ? 'ok' : 'warn'} small`} style={{ marginBottom: 10 }}>{pre[p.id].ok ? 'Todas as travas liberadas.' : pre[p.id].reasons.map((r: string) => <div key={r}>• {r}</div>)}</div>}
              <div className="row">
                <button className="btn sm" onClick={() => check(p.id)}>Verificar travas</button>
                <input type="datetime-local" style={{ width: 210 }} onChange={(e) => (p._new = e.target.value)} />
                <button className="btn sm" disabled={busy} onClick={() => p._new && run(() => api(`/api/publications/${p.id}`, { method: 'PATCH', body: { scheduled_at: new Date(p._new).toISOString() } }), 'Reagendado').then(reload)}>Reagendar</button>
                {['blocked', 'failed'].includes(p.status) && <button className="btn sm" disabled={busy} onClick={() => run(() => api(`/api/publications/${p.id}/retry`, { method: 'POST', body: {} }), 'Reenviado para a fila').then(reload)}>Tentar novamente</button>}
                <button className="btn sm danger" disabled={busy} onClick={() => confirm('Cancelar esta publicação?') && run(() => api(`/api/publications/${p.id}/cancel`, { method: 'POST', body: {} }), 'Cancelada').then(reload)}>Cancelar</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

export function Publications() {
  const [status, setStatus] = useState('');
  const { data, error } = useApi<any[]>(`/api/publications${status ? `?status=${status}` : ''}`, [status]);
  if (!data) return <Loading error={error} />;
  return (
    <Page title="Publicações" subtitle="Registro completo de publicações e resultados"
      actions={<select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}><option value="">Todas</option>{['published', 'scheduled', 'blocked', 'failed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select>}>
      <Card>
        {!data.length ? <div className="empty">Nenhuma publicação.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>#</th><th>Conteúdo</th><th>Formato</th><th>Agendado</th><th>Publicado</th><th>Alcance</th><th>Status</th></tr></thead>
            <tbody>{data.map((p) => <tr key={p.id}><td className="mono">{p.id}</td><td>{p.permalink ? <a href={p.permalink} target="_blank" rel="noreferrer">{p.title}</a> : p.title}{p.ig_media_id && <div className="dim small mono">{p.ig_media_id}</div>}</td><td>{FORMAT_LABEL[p.media_type]}</td><td>{fmtDateTime(p.scheduled_at)}</td><td>{fmtDateTime(p.published_at)}</td><td>{fmtNum(p.reach)}</td><td><Badge s={p.status} /></td></tr>)}</tbody>
          </table></div>
        )}
      </Card>
    </Page>
  );
}

export function SettingsPage() {
  const { data, error, reload } = useApi<any>('/api/settings');
  const { run, busy } = useAction();
  const [s, setS] = useState<any>(null);
  const [b, setB] = useState<any>(null);
  if (!data) return <Loading error={error} />;
  const st = s ?? data.settings;
  const br = b ?? data.brand;
  const upd = (path: string[], v: any) => {
    const n = structuredClone(st);
    let o = n;
    for (const k of path.slice(0, -1)) o = o[k];
    o[path.at(-1)!] = v;
    setS(n);
  };
  return (
    <Page title="Configurações" subtitle="Rotina, frequência, horários, regras e identidade visual"
      actions={<button className="btn primary" disabled={busy || (!s && !b)} onClick={async () => { if (s) await run(() => api('/api/settings', { method: 'PUT', body: s }), 'Configurações salvas'); if (b) await run(() => api('/api/brand', { method: 'PUT', body: b }), 'Marca salva'); setS(null); setB(null); reload(); }}>Salvar alterações</button>}>
      <div className="grid g2">
        <Card title="Rotina automática diária">
          <div className="field-row">
            {data.stages.map((x: any) => <label key={x.key}>{x.label}<input type="time" value={st.routine[x.key]} onChange={(e) => upd(['routine', x.key], e.target.value)} /></label>)}
            <label>Coleta de métricas<input type="time" value={st.routine.metrics} onChange={(e) => upd(['routine', 'metrics'], e.target.value)} /></label>
            <label>Relatório semanal<select value={st.routine.weekly_report_weekday} onChange={(e) => upd(['routine', 'weekly_report_weekday'], Number(e.target.value))}>{['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
          </div>
        </Card>
        <Card title="Frequência de publicação">
          <div className="field-row">
            <label>Reels por dia<input type="number" min={0} max={3} value={st.frequency.reels_per_day} onChange={(e) => upd(['frequency', 'reels_per_day'], Number(e.target.value))} /></label>
            <label>Feed por dia (alterna carrossel/imagem)<input type="number" min={0} max={3} value={st.frequency.feed_per_day} onChange={(e) => upd(['frequency', 'feed_per_day'], Number(e.target.value))} /></label>
            <label>Stories mín.<input type="number" min={0} max={10} value={st.frequency.stories_min} onChange={(e) => upd(['frequency', 'stories_min'], Number(e.target.value))} /></label>
            <label>Stories máx.<input type="number" min={0} max={10} value={st.frequency.stories_max} onChange={(e) => upd(['frequency', 'stories_max'], Number(e.target.value))} /></label>
          </div>
        </Card>
        <Card title="Horários e janela de publicação">
          <div className="field-row">
            <label>Reel<input type="time" value={st.publish_times.reel} onChange={(e) => upd(['publish_times', 'reel'], e.target.value)} /></label>
            <label>Feed<input type="time" value={st.publish_times.feed} onChange={(e) => upd(['publish_times', 'feed'], e.target.value)} /></label>
            <label>Janela início<input type="time" value={st.publish_window.start} onChange={(e) => upd(['publish_window', 'start'], e.target.value)} /></label>
            <label>Janela fim<input type="time" value={st.publish_window.end} onChange={(e) => upd(['publish_window', 'end'], e.target.value)} /></label>
          </div>
          <label style={{ marginTop: 12 }}>Horários dos stories (separados por vírgula)<input value={st.publish_times.stories.join(', ')} onChange={(e) => upd(['publish_times', 'stories'], e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean))} /></label>
        </Card>
        <Card title="Regras e qualidade">
          <div className="field-row">
            <label>Nota mínima de QA<input type="number" min={50} max={100} value={st.quality.min_score} onChange={(e) => upd(['quality', 'min_score'], Number(e.target.value))} /></label>
            <label>Máx. hashtags<input type="number" min={0} max={30} value={st.publishing_rules.max_hashtags} onChange={(e) => upd(['publishing_rules', 'max_hashtags'], Number(e.target.value))} /></label>
            <label>Horas entre posts de feed<input type="number" min={0} max={24} value={st.publishing_rules.min_hours_between_feed_posts} onChange={(e) => upd(['publishing_rules', 'min_hours_between_feed_posts'], Number(e.target.value))} /></label>
            <label>Aprovação humana<select value={st.require_human_approval ? '1' : '0'} onChange={(e) => upd(['require_human_approval'], e.target.value === '1')}><option value="1">Obrigatória</option><option value="0">Automática após QA</option></select></label>
          </div>
          <label style={{ marginTop: 12 }}>Termos bloqueados (vírgula)<input value={st.publishing_rules.blocked_terms.join(', ')} onChange={(e) => upd(['publishing_rules', 'blocked_terms'], e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean))} /></label>
        </Card>
        <Card title="Fontes de tendências">
          <label>Hashtags monitoradas (máx. 30 únicas / 7 dias pela API)<input value={st.trend_sources.hashtags.join(', ')} onChange={(e) => upd(['trend_sources', 'hashtags'], e.target.value.split(',').map((x: string) => x.trim().replace(/^#/, '')).filter(Boolean))} /></label>
          <label style={{ marginTop: 12 }}>Contas de referência (Business Discovery)<input value={st.trend_sources.reference_accounts.join(', ')} onChange={(e) => upd(['trend_sources', 'reference_accounts'], e.target.value.split(',').map((x: string) => x.trim().replace(/^@/, '')).filter(Boolean))} /></label>
          <label style={{ marginTop: 12 }}>Pesquisa web pública<select value={st.trend_sources.web_search ? '1' : '0'} onChange={(e) => upd(['trend_sources', 'web_search'], e.target.value === '1')}><option value="1">Ativada</option><option value="0">Desativada</option></select></label>
        </Card>
        <Card title="Pilares editoriais (peso)">
          <div className="field-row">{st.pillars.map((p: any, i: number) => <label key={p.key}>{p.label}<input type="number" min={0} max={5} value={p.weight} onChange={(e) => upd(['pillars', String(i), 'weight'], Number(e.target.value))} /></label>)}</div>
        </Card>
        <Card title="Identidade visual" className="span2">
          <div className="field-row">
            <label>Nome da marca<input value={br.brand_name} onChange={(e) => setB({ ...br, brand_name: e.target.value })} /></label>
            <label>@ do perfil<input value={br.handle ?? ''} onChange={(e) => setB({ ...br, handle: e.target.value })} /></label>
            <label>Nicho<select value={br.niche} onChange={(e) => setB({ ...br, niche: e.target.value })}>{[...new Set([br.niche, ...data.niches])].map((n: string) => <option key={n}>{n}</option>)}</select></label>
            <label>Público<input value={br.audience ?? ''} onChange={(e) => setB({ ...br, audience: e.target.value })} /></label>
          </div>
          <label style={{ marginTop: 12 }}>Tom de voz<textarea style={{ minHeight: 70 }} value={br.tone} onChange={(e) => setB({ ...br, tone: e.target.value })} /></label>
          <div className="field-row" style={{ marginTop: 12 }}>
            {Object.keys(br.colors).map((k) => <label key={k}>{k}<div className="row" style={{ flexWrap: 'nowrap' }}><input type="color" style={{ width: 44, padding: 2 }} value={br.colors[k]} onChange={(e) => setB({ ...br, colors: { ...br.colors, [k]: e.target.value } })} /><input value={br.colors[k]} onChange={(e) => setB({ ...br, colors: { ...br.colors, [k]: e.target.value } })} /></div></label>)}
          </div>
          <div className="field-row" style={{ marginTop: 12 }}>
            <label>Fonte títulos<input value={br.fonts.heading} onChange={(e) => setB({ ...br, fonts: { ...br.fonts, heading: e.target.value } })} /></label>
            <label>Fonte texto<input value={br.fonts.body} onChange={(e) => setB({ ...br, fonts: { ...br.fonts, body: e.target.value } })} /></label>
            <label>Margem (px)<input type="number" value={br.layout.margin} onChange={(e) => setB({ ...br, layout: { ...br.layout, margin: Number(e.target.value) } })} /></label>
            <label>Hashtags-base<input value={br.base_hashtags.join(', ')} onChange={(e) => setB({ ...br, base_hashtags: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) })} /></label>
          </div>
          <label style={{ marginTop: 12 }}>Palavras proibidas (vírgula)<input value={br.forbidden_words.join(', ')} onChange={(e) => setB({ ...br, forbidden_words: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) })} /></label>
        </Card>
      </div>
    </Page>
  );
}

export function Integrations() {
  const { data, error, reload } = useApi<any>('/api/integrations');
  const prod = useApi<any>('/api/production');
  const { run, busy } = useAction();
  const [niche, setNiche] = useState('');
  if (!data) return <Loading error={error} />;
  const acc = data.account;
  const sugg = acc?.niche_suggestion;
  return (
    <Page title="Integrações" subtitle="Conexões reais — nenhuma integração é simulada"
      actions={<button className="btn" disabled={busy} onClick={() => run(() => api('/api/integrations/check', { method: 'POST', body: {} }), 'Integrações verificadas').then(reload)}>Verificar tudo</button>}>
      <div className="grid g2">
        <Card title="Instagram (Graph API oficial)" actions={<Badge s={data.integrations.find((i: any) => i.key === 'instagram')?.status ?? 'not_configured'} />}>
          {!acc ? (
            <div className="grid" style={{ gap: 10 }}>
              <p className="muted" style={{ margin: 0 }}>Requer conta Instagram profissional (Business ou Creator) vinculada a uma Página do Facebook e um app Meta com as permissões instagram_basic, instagram_content_publish, instagram_manage_insights e pages_show_list.</p>
              {!data.oauthConfigured && <div className="alert warn small">Defina META_APP_ID, META_APP_SECRET e META_REDIRECT_URI no servidor para usar o login oficial.</div>}
              <div className="row">
                <button className="btn primary" disabled={busy || !data.oauthConfigured} onClick={() => run(async () => { const r = await api<{ url: string }>('/api/instagram/oauth/start'); window.location.href = r.url; })}>Conectar com Facebook</button>
                <button className="btn" disabled={busy} onClick={() => run(() => api('/api/instagram/connect-env-token', { method: 'POST', body: {} }), 'Conta conectada').then(reload)}>Usar IG_ACCESS_TOKEN do servidor</button>
              </div>
            </div>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              <div className="row"><b>@{acc.username}</b><span className="dim">{fmtNum(acc.followers_count)} seguidores · {acc.media_count} posts</span></div>
              <div className="list">{(acc.eligibility?.checks ?? []).map((c: any) => <div key={c.name} className="item small"><span>{c.ok ? '✅' : '⚠️'} {c.name}</span><span className="dim">{c.detail}</span></div>)}</div>
              <div className="row">
                <button className="btn" disabled={busy} onClick={() => run(() => api('/api/instagram/verify', { method: 'POST', body: {} }), 'Conta verificada').then(reload)}>Verificar conta</button>
                {!acc.permissions_confirmed ? <button className="btn primary" disabled={busy || !acc.eligibility?.ok} onClick={() => run(() => api('/api/instagram/confirm-permissions', { method: 'POST', body: {} }), 'Permissões confirmadas').then(reload)}>Confirmar permissões</button> : <Badge s="ok" label="Permissões confirmadas" />}
                <button className="btn danger" disabled={busy} onClick={() => confirm('Desconectar a conta? O modo de produção será desligado.') && run(() => api('/api/instagram/disconnect', { method: 'POST', body: {} }), 'Desconectada').then(reload)}>Desconectar</button>
              </div>
              <Card title="Nicho do perfil">
                <div className="grid" style={{ gap: 10 }}>
                  {acc.niche_confirmed ? <div>Nicho confirmado: <b>{acc.niche}</b></div> : <div className="alert warn small">Confirme o nicho antes de ativar a produção.</div>}
                  {sugg && <div className="small muted">Sugestão da análise: <b>{sugg.niche}</b> ({Math.round(sugg.confidence * 100)}%) — {sugg.reasoning}</div>}
                  <div className="row">
                    <button className="btn" disabled={busy} onClick={() => run(() => api('/api/instagram/analyze-niche', { method: 'POST', body: {} }), 'Perfil analisado').then(reload)}>Analisar perfil</button>
                    <input placeholder={sugg?.niche ?? 'Ex.: Fotografia mobile'} value={niche} onChange={(e) => setNiche(e.target.value)} style={{ width: 240 }} />
                    <button className="btn primary" disabled={busy || !(niche || sugg?.niche)} onClick={() => run(() => api('/api/instagram/niche', { method: 'POST', body: { niche: niche || sugg.niche, audience: sugg?.audience } }), 'Nicho confirmado').then(reload)}>Confirmar nicho</button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Card>
        <Card title="Modo de produção" className="kill">
          {!prod.data ? <Loading error={prod.error} /> : (
            <div className="grid" style={{ gap: 10 }}>
              <div className={`alert ${prod.data.production_mode ? 'ok' : 'warn'}`}>{prod.data.production_mode ? 'ATIVO — publicações automáticas habilitadas.' : 'Desligado — nada é publicado no Instagram.'}</div>
              <div className="list">{prod.data.checks.map((c: any) => <div key={c.key} className="item small"><span>{c.ok ? '✅' : '⛔'} {c.label}</span></div>)}</div>
              {prod.data.production_mode ? (
                <button className="btn danger" disabled={busy} onClick={() => run(() => api('/api/production', { method: 'POST', body: { enabled: false } }), 'Produção desligada').then(prod.reload)}>Desligar modo de produção</button>
              ) : (
                <button className="btn primary" disabled={busy || !prod.data.ready} onClick={() => { const c = prompt('Digite ATIVAR PRODUÇÃO para confirmar'); if (c) run(() => api('/api/production', { method: 'POST', body: { enabled: true, confirmation: c } }), 'Modo de produção ativado').then(prod.reload); }}>Ativar modo de produção</button>
              )}
            </div>
          )}
        </Card>
        {data.integrations.filter((i: any) => i.key !== 'instagram').map((i: any) => (
          <Card key={i.key} title={i.name} actions={<Badge s={i.status} />}>
            {Object.entries(i.details ?? {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => <div key={k} className="small"><span className="dim">{k}:</span> {String(v)}</div>)}
            {i.last_error && <div className="small" style={{ color: 'var(--red)' }}>{i.last_error}</div>}
            <div className="dim small" style={{ marginTop: 6 }}>Verificado: {fmtDateTime(i.last_check_at)}</div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function AgentHistory() {
  const agents = useApi<any[]>('/api/agents');
  const [agent, setAgent] = useState('');
  const [tab, setTab] = useState('exec');
  const execs = useApi<any[]>(`/api/executions?limit=100${agent ? `&agent=${agent}` : ''}`, [agent], 10000);
  const logs = useApi<any[]>(`/api/logs?limit=200${agent ? `&agent=${agent}` : ''}`, [agent], 10000);
  const jobs = useApi<any[]>('/api/jobs', [], 10000);
  const { run, busy } = useAction();
  return (
    <Page title="Histórico dos agentes" subtitle="Execuções, logs, fila de tarefas e memória operacional"
      actions={<select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ width: 190 }}><option value="">Todos os agentes</option>{agents.data?.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}</select>}>
      <div className="tabs">{[['exec', 'Execuções'], ['logs', 'Logs'], ['jobs', 'Fila'], ['agents', 'Agentes']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'exec' && <Card>{!execs.data ? <Loading error={execs.error} /> : <div className="table-wrap"><table>
        <thead><tr><th>#</th><th>Agente</th><th>Início</th><th>Duração</th><th>Tokens</th><th>Status</th><th>Detalhes</th></tr></thead>
        <tbody>{execs.data.map((e) => <tr key={e.id}><td className="mono">{e.id}</td><td>{e.agent_key}</td><td>{fmtDateTime(e.started_at)}</td><td>{e.duration_ms ? `${(e.duration_ms / 1000).toFixed(1)}s` : '—'}</td><td className="small">{e.tokens_in}/{e.tokens_out}</td><td><Badge s={e.status} /></td><td><details><summary className="small">ver</summary>{e.error && <div className="alert err small">{e.error}</div>}<pre className="json">{JSON.stringify({ input: e.input, output: e.output }, null, 1)}</pre></details></td></tr>)}</tbody>
      </table></div>}</Card>}
      {tab === 'logs' && <Card>{!logs.data ? <Loading error={logs.error} /> : <div className="list">{logs.data.map((l) => <div key={l.id} className="item small" style={{ display: 'grid', gridTemplateColumns: '130px 60px 120px 1fr', alignItems: 'start' }}><span className="dim">{fmtDateTime(l.created_at)}</span><span className={`badge ${l.level === 'error' ? 'red' : l.level === 'warn' ? 'amber' : ''}`}>{l.level}</span><span className="muted">{l.agent_key ?? 'sistema'}</span><span>{l.message}{l.data && <details><summary className="dim">dados</summary><pre className="json">{JSON.stringify(l.data, null, 1)}</pre></details>}</span></div>)}</div>}</Card>}
      {tab === 'jobs' && <Card>{!jobs.data ? <Loading error={jobs.error} /> : <div className="table-wrap"><table>
        <thead><tr><th>#</th><th>Tarefa</th><th>Lane</th><th>Executar em</th><th>Tentativas</th><th>Status</th><th>Erro</th><th></th></tr></thead>
        <tbody>{jobs.data.map((j) => <tr key={j.id}><td className="mono">{j.id}</td><td className="mono">{j.type}</td><td>{j.lane}</td><td>{fmtDateTime(j.run_at)}</td><td>{j.attempts}/{j.max_attempts}</td><td><Badge s={j.status} /></td><td className="small" style={{ color: 'var(--red)', maxWidth: 320 }}>{j.last_error}</td><td>{['dead', 'cancelled'].includes(j.status) && <button className="btn sm" disabled={busy} onClick={() => run(() => api(`/api/jobs/${j.id}/retry`, { method: 'POST', body: {} }), 'Reenfileirado').then(jobs.reload)}>Reexecutar</button>}</td></tr>)}</tbody>
      </table></div>}</Card>}
      {tab === 'agents' && <div className="grid g2">{agents.data?.map((a) => (
        <Card key={a.key} title={a.name} actions={<><Badge s={a.enabled ? a.status : 'paused'} /><button className="btn sm" disabled={busy} onClick={() => run(() => api(`/api/agents/${a.key}`, { method: 'PATCH', body: { enabled: !a.enabled } }), a.enabled ? 'Agente pausado' : 'Agente ativado').then(agents.reload)}>{a.enabled ? 'Pausar' : 'Ativar'}</button></>}>
          <div className="dim small">{a.role}</div>
          <h3 style={{ margin: '12px 0 6px' }}>Instruções</h3><pre className="json">{a.instructions}</pre>
          <h3 style={{ margin: '12px 0 6px' }}>Ferramentas autorizadas</h3><div className="row">{a.tools.map((t: string) => <span key={t} className="badge">{t}</span>)}</div>
          <h3 style={{ margin: '12px 0 6px' }}>Memória operacional</h3><pre className="json">{JSON.stringify(a.memory, null, 1)}</pre>
        </Card>
      ))}</div>}
    </Page>
  );
}
