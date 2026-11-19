import { useMemo, useState } from 'react';
import { api, Badge, Card, fmtDate, fmtDateTime, FORMAT_LABEL, Loading, mediaUrl, Modal, Page, useAction, useApi } from '../lib';

const today = () => new Date().toLocaleDateString('sv-SE');
const plus = (d: string, n: number) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };

export function CalendarPage() {
  const [from, setFrom] = useState(today());
  const { data, error, reload } = useApi<any[]>(`/api/calendar?from=${from}&to=${plus(from, 29)}`, [from]);
  const [edit, setEdit] = useState<any>(null);
  const { run, busy } = useAction();
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => plus(from, i)), [from]);
  if (!data) return <Loading error={error} />;
  return (
    <Page title="Calendário editorial" subtitle="30 dias · pilares distribuídos sem repetir assunto em dias consecutivos"
      actions={<>
        <button className="btn" onClick={() => setFrom(plus(from, -7))}>←</button>
        <button className="btn" onClick={() => setFrom(today())}>Hoje</button>
        <button className="btn" onClick={() => setFrom(plus(from, 7))}>→</button>
        <button className="btn primary" disabled={busy} onClick={() => run(() => api('/api/agents/run', { method: 'POST', body: { type: 'strategist.calendar', date: from, days: 30 } }), 'Strategist gerando calendário de 30 dias')}>Gerar 30 dias</button>
      </>}>
      {!data.length && <div className="empty" style={{ marginBottom: 16 }}>Calendário vazio. Clique em “Gerar 30 dias” (requer a integração com o Claude).</div>}
      <div className="cal">
        {days.map((d) => (
          <div key={d} className={`cal-day ${d === today() ? 'today' : ''}`}>
            <div className="small muted">{fmtDate(d)}</div>
            {data.filter((c) => c.date === d).map((c) => (
              <div key={c.id} className={`cal-item ${c.format}`} onClick={() => setEdit(c)} title={c.rationale ?? ''}>
                <div className="row" style={{ justifyContent: 'space-between' }}><b>{FORMAT_LABEL[c.format]}</b><span className="dim">{c.scheduled_time}</span></div>
                <div>{c.theme ?? <span className="dim">{c.pillar}</span>}</div>
                <div style={{ marginTop: 4 }}><Badge s={c.project_status ?? c.status} /></div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)}>
          <div className="card-head"><h2>{FORMAT_LABEL[edit.format]} · {fmtDate(edit.date)}</h2><Badge s={edit.status} /></div>
          <div className="grid" style={{ gap: 12 }}>
            <label>Tema<input defaultValue={edit.theme ?? ''} onChange={(e) => (edit.theme = e.target.value)} /></label>
            <div className="field-row">
              <label>Pilar<input defaultValue={edit.pillar} onChange={(e) => (edit.pillar = e.target.value)} /></label>
              <label>Horário<input type="time" defaultValue={edit.scheduled_time} onChange={(e) => (edit.scheduled_time = e.target.value)} /></label>
            </div>
            {edit.idea_title && <Card title="Pauta do Strategist"><table><tbody>
              <tr><td className="dim">Título</td><td>{edit.idea_title}</td></tr>
              <tr><td className="dim">Objetivo</td><td>{edit.objective}</td></tr>
              <tr><td className="dim">Público</td><td>{edit.audience}</td></tr>
              <tr><td className="dim">Gancho</td><td>{edit.hook}</td></tr>
              <tr><td className="dim">CTA</td><td>{edit.cta}</td></tr>
              <tr><td className="dim">Justificativa</td><td>{edit.rationale}</td></tr>
            </tbody></table></Card>}
            <label>Notas<textarea defaultValue={edit.notes ?? ''} onChange={(e) => (edit.notes = e.target.value)} /></label>
            <div className="row"><button className="btn primary" disabled={busy} onClick={() => run(() => api(`/api/calendar/${edit.id}`, { method: 'PATCH', body: { theme: edit.theme ?? undefined, pillar: edit.pillar, scheduled_time: edit.scheduled_time, notes: edit.notes ?? undefined } }), 'Item atualizado').then(() => { setEdit(null); reload(); })}>Salvar</button></div>
          </div>
        </Modal>
      )}
    </Page>
  );
}

export function Studio() {
  const [status, setStatus] = useState('');
  const { data, error, reload } = useApi<any[]>(`/api/projects${status ? `?status=${status}` : ''}`, [status], 15000);
  const [open, setOpen] = useState<number | null>(null);
  const { run, busy } = useAction();
  if (!data) return <Loading error={error} />;
  return (
    <Page title="Central de criação" subtitle="Roteiros, artes, vídeos e revisão de qualidade"
      actions={<>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}>
          <option value="">Todos</option>{['review', 'approved', 'rejected', 'failed', 'scheduled', 'published', 'copy_ready'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn" disabled={busy} onClick={() => run(() => api('/api/agents/run', { method: 'POST', body: { type: 'copywriter.write' } }), 'Copywriter enfileirado')}>✍️ Gerar copies do dia</button>
        <button className="btn primary" disabled={busy} onClick={() => run(() => api('/api/agents/run', { method: 'POST', body: { type: 'creative.produce' } }), 'Creative Studio enfileirado')}>🎬 Produzir mídias do dia</button>
      </>}>
      {!data.length ? <div className="empty">Nenhum conteúdo em produção.</div> : (
        <div className="thumbs" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {data.map((p) => (
            <div key={p.id} className="card hover" style={{ padding: 10, cursor: 'pointer' }} onClick={() => setOpen(p.id)}>
              <div className="thumb" style={{ marginBottom: 10 }}>{p.thumb ? <img src={mediaUrl(p.thumb)} alt="" loading="lazy" /> : <span className="dim small">sem mídia</span>}</div>
              <div style={{ fontWeight: 600 }}>{p.title}</div>
              <div className="row small" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span className="dim">{FORMAT_LABEL[p.format]} · {p.date ? fmtDate(p.date) : ''}</span>
                <Badge s={p.status} />
              </div>
              {p.quality_report?.score != null && <div className="small dim" style={{ marginTop: 4 }}>QA {p.quality_report.score}/100</div>}
            </div>
          ))}
        </div>
      )}
      {open && <ProjectModal id={open} onClose={() => { setOpen(null); reload(); }} />}
    </Page>
  );
}

export function ProjectModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error, reload } = useApi<any>(`/api/projects/${id}`);
  const { run, busy } = useAction();
  const [tab, setTab] = useState('midia');
  if (!data) return <Modal onClose={onClose}><Loading error={error} /></Modal>;
  const qr = data.quality_report ?? {};
  const cap = data.captions[0];
  return (
    <Modal onClose={onClose}>
      <div className="card-head">
        <div><h2>{data.title}</h2><div className="dim small">{FORMAT_LABEL[data.format]} · {data.date && fmtDate(data.date)} {data.scheduled_time}</div></div>
        <Badge s={data.status} />
      </div>
      <div className="tabs">{[['midia', 'Mídia'], ['roteiro', 'Roteiro'], ['legenda', 'Legenda'], ['qa', `Qualidade ${qr.score ?? ''}`], ['pauta', 'Pauta'], ['pub', 'Publicações']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'midia' && (
        <div className="thumbs">
          {data.assets.map((a: any) => (
            <div key={a.id}>
              <div className={`thumb ${a.height > 1400 ? 'tall' : ''}`}>{a.mime.startsWith('video') ? <video src={mediaUrl(a.file_name)} controls playsInline /> : <img src={mediaUrl(a.file_name)} alt="" />}</div>
              <div className="small dim" style={{ marginTop: 4 }}>{a.kind} #{a.position + 1} · QA {a.quality_score}</div>
            </div>
          ))}
          {!data.assets.length && <div className="empty">Mídias ainda não renderizadas.</div>}
        </div>
      )}
      {tab === 'roteiro' && (
        <div className="grid" style={{ gap: 10 }}>
          {data.script?.scenes?.length > 0 && <table><thead><tr><th>Tempo</th><th>Texto na tela</th><th>Narração</th><th>Direção</th></tr></thead><tbody>{data.script.scenes.map((s: any, i: number) => <tr key={i}><td className="mono">{s.start}–{s.end}s</td><td><b>{s.on_screen_text}</b>{s.emphasis && <div className="dim small">{s.emphasis}</div>}</td><td className="small">{s.voiceover}</td><td className="small muted">{s.visual_direction}</td></tr>)}</tbody></table>}
          {data.slides?.length > 0 && <div className="list">{data.slides.map((s: any, i: number) => <div key={i} className="item" style={{ display: 'block' }}><b>{i + 1}. {s.title}</b><div className="muted small">{s.body}</div></div>)}</div>}
          {data.stories?.length > 0 && <div className="list">{data.stories.map((s: any, i: number) => <div key={i} className="item" style={{ display: 'block' }}><b>Story {i + 1}</b>: {s.text}{s.interaction_prompt && <div className="dim small">Interação: {s.interaction_prompt}</div>}</div>)}</div>}
          {data.script?.image && <div className="item" style={{ display: 'block' }}><b>{data.script.image.headline}</b><div className="muted">{data.script.image.subheadline}</div></div>}
        </div>
      )}
      {tab === 'legenda' && (cap ? <div className="grid" style={{ gap: 10 }}><pre className="json" style={{ maxHeight: 400, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }}>{cap.full_text}</pre><div className="dim small">Versão {cap.version} · {cap.author} · edite em “Editor de legendas”.</div></div> : <div className="empty">Sem legenda.</div>)}
      {tab === 'qa' && (
        <div className="grid" style={{ gap: 10 }}>
          <div className={`alert ${qr.passed ? 'ok' : 'err'}`}>{qr.passed ? 'Aprovado' : 'Reprovado'} na revisão automática · nota {qr.score ?? '—'}/100{qr.error && ` · ${qr.error}`}</div>
          {(qr.media ?? []).map((m: any, i: number) => m.issues.length > 0 && <div key={i} className="item" style={{ display: 'block' }}><b>Mídia {i + 1}</b> — {m.score}/100<ul>{m.issues.map((x: any, j: number) => <li key={j}><span className={`badge ${x.severity === 'critical' ? 'red' : x.severity === 'major' ? 'amber' : ''}`}>{x.severity}</span> {x.message}</li>)}</ul></div>)}
          {(qr.copy ?? []).length > 0 && <div className="item" style={{ display: 'block' }}><b>Copy</b><ul>{qr.copy.map((x: any, j: number) => <li key={j}><span className={`badge ${x.severity === 'critical' ? 'red' : x.severity === 'major' ? 'amber' : ''}`}>{x.severity}</span> {x.message}</li>)}</ul></div>}
        </div>
      )}
      {tab === 'pauta' && (data.idea ? <table><tbody>{['theme', 'objective', 'audience', 'hook', 'cta', 'suggested_time', 'rationale'].map((k) => <tr key={k}><td className="dim">{k}</td><td>{data.idea[k]}</td></tr>)}</tbody></table> : <div className="empty">Sem pauta vinculada.</div>)}
      {tab === 'pub' && (data.publications.length ? <div className="list">{data.publications.map((p: any) => <div key={p.id} className="item"><div>#{p.id} {FORMAT_LABEL[p.media_type]} · {fmtDateTime(p.scheduled_at)}{p.block_reasons?.length > 0 && <div className="small" style={{ color: 'var(--red)' }}>{p.block_reasons.join(' · ')}</div>}</div><Badge s={p.status} /></div>)}</div> : <div className="empty">Ainda não agendado.</div>)}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn" disabled={busy} onClick={() => run(() => api(`/api/projects/${id}/rerender`, { method: 'POST', body: {} }), 'Nova renderização enfileirada').then(reload)}>↻ Renderizar novamente</button>
        {['review', 'approved'].includes(data.status) && <button className="btn danger" disabled={busy} onClick={() => { const reason = prompt('Motivo da reprovação'); if (reason) run(() => api(`/api/projects/${id}/reject`, { method: 'POST', body: { reason } }), 'Reprovado').then(reload); }}>Reprovar</button>}
        {['review', 'approved'].includes(data.status) && qr.passed && <button className="btn primary" disabled={busy} onClick={() => run(() => api(`/api/projects/${id}/approve`, { method: 'POST', body: { schedule: true } }), 'Aprovado e agendado').then(reload)}>Aprovar e agendar</button>}
      </div>
    </Modal>
  );
}

export function CaptionEditor() {
  const projects = useApi<any[]>('/api/projects');
  const [pid, setPid] = useState<number | null>(null);
  const caps = useApi<any[]>(pid ? `/api/captions/${pid}` : null, [pid]);
  const [draft, setDraft] = useState<any>(null);
  const { run, busy } = useAction();
  const current = caps.data?.[0];
  const d = draft ?? (current ? { hook: current.hook ?? '', body: current.body, cta: current.cta ?? '', hashtags: (current.hashtags ?? []).join(' ') } : null);
  const preview = d ? [d.hook, d.body, d.cta, d.hashtags.split(/[\s,]+/).filter(Boolean).map((t: string) => `#${t.replace(/^#/, '')}`).join(' ')].filter(Boolean).join('\n\n') : '';
  return (
    <Page title="Editor de legendas" subtitle="Edite com histórico de versões · as regras de publicação são verificadas antes de publicar">
      <div className="grid g3">
        <Card title="Conteúdos">
          {!projects.data ? <Loading error={projects.error} /> : <div className="list" style={{ maxHeight: 640, overflowY: 'auto' }}>
            {projects.data.map((p) => <div key={p.id} className="item" style={{ cursor: 'pointer', borderColor: pid === p.id ? 'var(--blue)' : undefined }} onClick={() => { setPid(p.id); setDraft(null); }}><div><div>{p.title}</div><div className="dim small">{FORMAT_LABEL[p.format]}</div></div><Badge s={p.status} /></div>)}
          </div>}
        </Card>
        <Card title="Editar" className="span2">
          {!pid ? <div className="empty">Selecione um conteúdo.</div> : !d ? <Loading error={caps.error} /> : (
            <div className="grid g2">
              <div className="grid" style={{ gap: 10, alignContent: 'start' }}>
                <label>Gancho (1ª linha)<input value={d.hook} onChange={(e) => setDraft({ ...d, hook: e.target.value })} /></label>
                <label>Corpo<textarea style={{ minHeight: 200 }} value={d.body} onChange={(e) => setDraft({ ...d, body: e.target.value })} /></label>
                <label>CTA<input value={d.cta} onChange={(e) => setDraft({ ...d, cta: e.target.value })} /></label>
                <label>Hashtags (separadas por espaço)<input value={d.hashtags} onChange={(e) => setDraft({ ...d, hashtags: e.target.value })} /></label>
                <div className="row"><button className="btn primary" disabled={busy} onClick={() => run(() => api(`/api/captions/${pid}`, { method: 'POST', body: { hook: d.hook, body: d.body, cta: d.cta, hashtags: d.hashtags.split(/[\s,]+/).filter(Boolean) } }), 'Nova versão salva').then(() => { setDraft(null); caps.reload(); })}>Salvar nova versão</button><span className="dim small">{preview.length}/2200</span></div>
              </div>
              <div className="grid" style={{ gap: 10, alignContent: 'start' }}>
                <h3>Pré-visualização</h3>
                <pre className="json" style={{ color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, maxHeight: 360 }}>{preview}</pre>
                <h3>Histórico</h3>
                <div className="list">{caps.data!.map((c) => <div key={c.id} className="item small"><span>v{c.version} · {c.author}</span><span className="dim">{fmtDateTime(c.created_at)}</span></div>)}</div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}

export function MediaLibrary() {
  const { data, error } = useApi<any[]>('/api/media');
  const [kind, setKind] = useState('');
  if (!data) return <Loading error={error} />;
  const list = data.filter((m) => !kind || m.kind === kind);
  return (
    <Page title="Biblioteca de mídias" subtitle={`${data.length} arquivos gerados pelo Creative Studio`}
      actions={<select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 160 }}><option value="">Todos</option>{['image', 'slide', 'cover', 'video', 'story'].map((k) => <option key={k}>{k}</option>)}</select>}>
      {!list.length ? <div className="empty">Nenhuma mídia.</div> : (
        <div className="thumbs">
          {list.map((m) => (
            <div key={m.id}>
              <div className={`thumb ${m.height > 1400 ? 'tall' : ''}`}>{m.mime.startsWith('video') ? <video src={mediaUrl(m.file_name)} controls preload="metadata" playsInline /> : <img src={mediaUrl(m.file_name)} alt="" loading="lazy" />}</div>
              <div className="small" style={{ marginTop: 6 }}>{m.title}</div>
              <div className="small dim">{m.kind} · {m.width}×{m.height}{m.duration_seconds ? ` · ${m.duration_seconds.toFixed(1)}s` : ''} · {(m.size_bytes / 1024).toFixed(0)} KB · QA {m.quality_score}</div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
