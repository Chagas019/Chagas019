import Link from 'next/link';
import { getParish } from '@/lib/parish';
import { upcomingEvents, fill, canManage } from '@/lib/queries';
import { Band, Flash } from '@/components/Band';
import { Icon } from '@/components/Icon';
import { fmt, fmtTime, TYPE_LABEL, TZ } from '@/lib/format';
import { createEvent, deleteEvent } from '../actions';

export const metadata = { title: 'Agenda' };

export default async function Agenda({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ m?: string; ok?: string; erro?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getParish(slug);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? '') ? sp.m! : today.slice(0, 7);
  const [y, mo] = month.split('-').map(Number);
  const start = new Date(`${month}-01T00:00:00-03:00`);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const events = await upcomingEvents(ctx, days, start.toISOString());
  const shift = (n: number) => { const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const { data: pastorals } = await ctx.supabase.from('pastorals').select('id, name').eq('parish_id', ctx.parish.id).eq('active', true).order('name');
  const allowed = (pastorals ?? []).filter(p => ctx.staff || ctx.coordinates.includes(p.id));
  const canCreate = ctx.staff || allowed.length > 0;
  const byDay = new Map<string, typeof events>();
  events.forEach(e => { const k = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(e.starts_at)); byDay.set(k, [...(byDay.get(k) ?? []), e]); });
  const back = `/p/${slug}/agenda?m=${month}`;

  return (
    <>
      <Band title="Agenda" sub="Missas, reuniões, formações e festas da paróquia." parish={ctx.parish} />
      <div className="workspace">
        <Flash ok={sp.ok} erro={sp.erro} />
        <div className="split">
          <section>
            <div className="cal-head">
              <h2>{fmt(start.toISOString(), { month: 'long', year: 'numeric' })}</h2>
              <Link className="btn sm" href={`/p/${slug}/agenda`}>Hoje</Link>
              <Link className="icon-btn" href={`/p/${slug}/agenda?m=${shift(-1)}`} aria-label="Mês anterior">‹</Link>
              <Link className="icon-btn" href={`/p/${slug}/agenda?m=${shift(1)}`} aria-label="Próximo mês">›</Link>
            </div>
            {events.length === 0 ? <div className="empty-state"><b>Nenhum evento neste mês</b>{canCreate ? 'Use o formulário ao lado para cadastrar.' : 'A coordenação ainda não cadastrou eventos.'}</div> : (
              <div className="stack">
                {[...byDay.entries()].map(([day, evs]) => (
                  <div key={day}>
                    <div className="group-label" style={{ padding: '4px 4px 8px' }}>{fmt(evs[0].starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}{day === today ? ' · hoje' : ''}</div>
                    {evs.map(e => { const f = fill(e); return (
                      <div className={`ev-item ty-${e.type}`} key={e.id}>
                        <b>{e.title}</b>
                        <small>{fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''} · {TYPE_LABEL[e.type]}</small>
                        <div className="row">
                          {e.roster_slots.length > 0 && <span className={`tag ${f.a < f.t ? 'warn' : 'ok'}`}>Escala {f.a}/{f.t}</span>}
                          <Link className="btn sm" href={`/p/${slug}/escalas#e-${e.id}`}>Escala <Icon name="arrow" size={15} /></Link>
                          {canManage(ctx, e.pastoral_id) && (
                            <form action={deleteEvent}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={back} />
                              <button className="btn sm" aria-label={`Excluir ${e.title}`}>Excluir</button></form>)}
                        </div>
                      </div>); })}
                  </div>
                ))}
              </div>
            )}
          </section>
          {canCreate && (
            <aside className="tile day-panel">
              <h3>Novo evento</h3>
              <form action={createEvent}>
                <input type="hidden" name="slug" value={slug} /><input type="hidden" name="back" value={back} />
                <label className="field">Título<input name="title" required maxLength={120} placeholder="Missa Dominical" /></label>
                <div className="field-row">
                  <label className="field">Tipo<select name="type">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                  <label className="field">Pastoral<select name="pastoral_id" required={!ctx.staff}>
                    {ctx.staff && <option value="">Paróquia toda</option>}
                    {allowed.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                </div>
                <div className="field-row">
                  <label className="field">Data<input type="date" name="date" required defaultValue={today} /></label>
                  <label className="field">Horário<input type="time" name="time" required defaultValue="19:00" /></label>
                </div>
                <label className="field">Local<input name="location" maxLength={80} placeholder="Igreja matriz" /></label>
                <button className="btn primary block">Salvar evento</button>
              </form>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
