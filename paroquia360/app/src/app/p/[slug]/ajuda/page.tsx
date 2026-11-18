import Link from 'next/link';
import { getParish } from '@/lib/parish';
import { directory, canManage } from '@/lib/queries';
import { Band, Flash } from '@/components/Band';
import { fmt, fmtDay, fmtTime, initials, pl, TZ } from '@/lib/format';
import { createHelpRequest, setHelpStatus, offerHelp, withdrawOffer, decideOffer } from '../actions';

export const metadata = { title: 'Preciso de ajuda' };
const Hidden = ({ v }: { v: Record<string, string> }) => <>{Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}</>;
const OFFER: Record<string, string> = { offered: 'Ofereceu ajuda', accepted: 'Aceito', declined: 'Recusado', withdrawn: 'Retirou' };

type Req = {
  id: string; title: string; description: string | null; needed: number; status: string; pastoral_id: string; skill_id: string | null; created_at: string;
  pastorals: { name: string } | null; skills: { name: string } | null; events: { title: string; starts_at: string } | null;
  help_offers: { id: string; user_id: string; status: string }[];
};

export default async function Ajuda({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; erro?: string; ver?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getParish(slug);
  const { supabase, parish, user } = ctx;
  const showClosed = sp.ver === 'todos';
  const back = `/p/${slug}/ajuda${showClosed ? '?ver=todos' : ''}`;
  const base = { slug, back };
  const now = new Date().toISOString();
  const in60 = new Date(Date.now() + 60 * 864e5).toISOString();

  let q = supabase.from('help_requests')
    .select('id, title, description, needed, status, pastoral_id, skill_id, created_at, pastorals(name), skills(name), events(title, starts_at), help_offers(id, user_id, status)')
    .eq('parish_id', parish.id).order('created_at', { ascending: false }).limit(50);
  if (!showClosed) q = q.eq('status', 'open');
  const [reqRes, dir, pastorals, skills, events, vskills, avail] = await Promise.all([
    q, directory(ctx),
    supabase.from('pastorals').select('id, name').eq('parish_id', parish.id).eq('active', true).order('name'),
    supabase.from('skills').select('id, name').eq('parish_id', parish.id).order('name'),
    supabase.from('events').select('id, title, starts_at').eq('parish_id', parish.id).gte('starts_at', now).lt('starts_at', in60).order('starts_at'),
    supabase.from('volunteer_skills').select('user_id, skill_id').eq('parish_id', parish.id),
    supabase.from('availability').select('user_id, weekday').eq('parish_id', parish.id).eq('available', true),
  ]);
  const reqs = (reqRes.data ?? []) as unknown as Req[];
  const allowed = (pastorals.data ?? []).filter(p => ctx.staff || ctx.coordinates.includes(p.id));
  const name = (id: string) => dir.get(id)?.display_name || 'Pessoa';
  const weekday = (iso: string) => new Date(new Date(iso).toLocaleString('en-US', { timeZone: TZ })).getDay();

  // Sugestões: quem tem o talento pedido e, se houver evento, disponibilidade naquele dia da semana.
  const suggest = (r: Req) => {
    if (!r.skill_id) return [];
    const offered = new Set(r.help_offers.filter(o => o.status !== 'withdrawn').map(o => o.user_id));
    const wd = r.events ? weekday(r.events.starts_at) : null;
    return (vskills.data ?? []).filter(v => v.skill_id === r.skill_id && !offered.has(v.user_id))
      .map(v => ({ id: v.user_id, free: wd === null ? null : (avail.data ?? []).some(a => a.user_id === v.user_id && a.weekday === wd) }))
      .sort((a, b) => Number(b.free) - Number(a.free));
  };

  return (
    <>
      <Band title="Preciso de ajuda" sub="A pastoral publica o que precisa; quem tem o talento e está livre se oferece." parish={parish}
        action={<Link className="pill rent" href={showClosed ? `/p/${slug}/ajuda` : `/p/${slug}/ajuda?ver=todos`}>{showClosed ? 'Só abertos' : 'Ver todos'}</Link>} />
      <div className="workspace">
        <Flash ok={sp.ok} erro={sp.erro} />
        <div className="split">
          <div className="stack">
            {reqs.length === 0 && <div className="empty-state"><b>Nenhum pedido {showClosed ? '' : 'aberto '}agora</b>{allowed.length ? 'Publique o primeiro pelo formulário ao lado.' : 'Quando uma pastoral precisar de ajuda, aparece aqui.'}</div>}
            {reqs.map(r => {
              const manage = canManage(ctx, r.pastoral_id);
              const mine = r.help_offers.find(o => o.user_id === user.id);
              const active = r.help_offers.filter(o => o.status === 'offered' || o.status === 'accepted');
              const accepted = r.help_offers.filter(o => o.status === 'accepted').length;
              const sug = manage && r.status === 'open' ? suggest(r) : [];
              return (
                <section className="tile" key={r.id}>
                  <div className="ev-head">
                    <div>
                      <h2>{r.needed} × {r.title}</h2>
                      <p className="muted">
                        {r.pastorals?.name}{r.skills ? ` · talento: ${r.skills.name}` : ''}
                        {r.events ? ` · ${r.events.title}, ${fmtDay(r.events.starts_at)} ${fmtTime(r.events.starts_at)}` : ''}
                      </p>
                    </div>
                    <span className={`tag ${r.status === 'filled' || (r.status === 'open' && accepted >= r.needed) ? 'ok' : r.status === 'open' ? 'warn' : ''}`}>
                      {r.status === 'open' ? `${accepted}/${r.needed} confirmados` : r.status === 'filled' ? 'Atendido' : 'Cancelado'}
                    </span>
                  </div>
                  {r.description && <p style={{ marginBottom: 12 }}>{r.description}</p>}

                  {r.status === 'open' && (!mine || mine.status === 'withdrawn' ? (
                    <form action={offerHelp}><Hidden v={{ ...base, request_id: r.id, offer_id: mine?.id ?? '' }} /><button className="btn-gold">Posso ajudar</button></form>
                  ) : (
                    <div className="inline-form">
                      <span className={`tag ${mine.status === 'accepted' ? 'ok' : mine.status === 'declined' ? 'bad' : ''}`}>Você: {OFFER[mine.status]}</span>
                      {mine.status === 'offered' && <form action={withdrawOffer}><Hidden v={{ ...base, offer_id: mine.id }} /><button className="btn sm">Retirar oferta</button></form>}
                    </div>
                  ))}

                  {manage && (
                    <div className="role-block" style={{ marginTop: 12 }}>
                      <header><b>Ofertas</b><small>{pl(active.length, 'pessoa', 'pessoas')}</small></header>
                      {r.help_offers.filter(o => o.status !== 'withdrawn').length === 0 && <p className="muted">Ninguém se ofereceu ainda.</p>}
                      <div className="people">
                        {r.help_offers.filter(o => o.status !== 'withdrawn').map(o => (
                          <div className="person" key={o.id}>
                            <span className="av">{initials(name(o.user_id))}</span>
                            <span className="t"><b>{name(o.user_id)}</b><small className={o.status === 'accepted' ? 'st-confirmed' : o.status === 'declined' ? 'st-declined' : ''}>{OFFER[o.status]}</small></span>
                            {o.status === 'offered' && <>
                              <form action={decideOffer}><Hidden v={{ ...base, offer_id: o.id, status: 'accepted' }} /><button className="icon-btn" title="Aceitar" aria-label={`Aceitar ${name(o.user_id)}`}>✓</button></form>
                              <form action={decideOffer}><Hidden v={{ ...base, offer_id: o.id, status: 'declined' }} /><button className="icon-btn" title="Recusar" aria-label={`Recusar ${name(o.user_id)}`}>✕</button></form>
                            </>}
                          </div>
                        ))}
                      </div>
                      {sug.length > 0 && <>
                        <p className="muted" style={{ marginTop: 12 }}>Têm o talento{r.events ? ' (✓ = disponível nesse dia da semana)' : ''}:</p>
                        <p>{sug.slice(0, 12).map(x => `${name(x.id)}${x.free ? ' ✓' : ''}`).join(' · ')}</p>
                        <p className="muted">Avise essas pessoas para abrirem esta página e tocarem em “Posso ajudar”.</p>
                      </>}
                      <div className="inline-form" style={{ marginTop: 12 }}>
                        {r.status === 'open' ? <>
                          <form action={setHelpStatus}><Hidden v={{ ...base, id: r.id, status: 'filled' }} /><button className="btn sm primary">Marcar como atendido</button></form>
                          <form action={setHelpStatus}><Hidden v={{ ...base, id: r.id, status: 'cancelled' }} /><button className="btn sm">Cancelar pedido</button></form>
                        </> : <form action={setHelpStatus}><Hidden v={{ ...base, id: r.id, status: 'open' }} /><button className="btn sm">Reabrir</button></form>}
                        <span className="muted">publicado em {fmt(r.created_at, { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          {allowed.length > 0 && (
            <aside className="tile day-panel">
              <h3>Novo pedido</h3>
              <form action={createHelpRequest}>
                <Hidden v={base} />
                <label className="field">O que precisa<input name="title" required maxLength={120} placeholder="Fotógrafo para a festa" /></label>
                <div className="field-row">
                  <label className="field">Pastoral<select name="pastoral_id" required>{allowed.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <label className="field">Quantas pessoas<input type="number" name="needed" min={1} max={50} defaultValue={1} /></label>
                </div>
                <label className="field">Talento (opcional)<select name="skill_id"><option value="">Qualquer pessoa</option>{(skills.data ?? []).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
                <label className="field">Evento (opcional)<select name="event_id"><option value="">Sem evento</option>{(events.data ?? []).map(e => <option key={e.id} value={e.id}>{fmtDay(e.starts_at)} · {e.title}</option>)}</select></label>
                <label className="field">Detalhes (opcional)<input name="description" maxLength={300} placeholder="Horário, local, o que levar…" /></label>
                <button className="btn primary block">Publicar pedido</button>
              </form>
              {(skills.data ?? []).length === 0 && <p className="muted" style={{ marginTop: 10 }}>Dica: cadastre talentos (Fotografia, Violão…) em <Link href={`/p/${slug}/equipe`}>Equipe</Link> para o sistema sugerir pessoas.</p>}
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
