import Link from 'next/link';
import { getParish } from '@/lib/parish';
import { upcomingEvents, fill } from '@/lib/queries';
import { Band, Flash } from '@/components/Band';
import { Icon } from '@/components/Icon';
import { fmtDay, fmtTime, fmt, pl, TYPE_LABEL, STATUS_LABEL, ROLE_LABEL } from '@/lib/format';
import { respond } from './actions';

export const metadata = { title: 'Painel' };

export default async function Painel({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getParish(slug);
  const { supabase, parish, user, role } = ctx;
  const events = await upcomingEvents(ctx, 30);
  const week = events.filter(e => new Date(e.starts_at).getTime() < Date.now() + 7 * 864e5);
  const mine = events.flatMap(e => e.roster_slots.flatMap(s => s.roster_assignments.filter(a => a.user_id === user.id).map(a => ({ e, s, a }))));
  const gaps = events.flatMap(e => e.roster_slots.filter(s => s.roster_assignments.length < s.quantity).map(s => ({ e, s, n: s.quantity - s.roster_assignments.length })));
  const swaps = events.reduce((n, e) => n + e.roster_slots.reduce((m, s) => m + s.roster_assignments.filter(a => a.status === 'swap_requested').length, 0), 0);
  const [{ count: members }, { count: pastorals }, helpRes] = await Promise.all([
    supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('parish_id', parish.id).eq('active', true),
    supabase.from('pastorals').select('id', { count: 'exact', head: true }).eq('parish_id', parish.id).eq('active', true),
    supabase.from('help_requests').select('id, title, needed, pastorals(name)').eq('parish_id', parish.id).eq('status', 'open').order('created_at', { ascending: false }).limit(4),
  ]);
  const help = (helpRes.data ?? []) as unknown as { id: string; title: string; needed: number; pastorals: { name: string } | null }[];
  const masses = week.filter(e => e.type === 'mass');
  const conf = masses.reduce((a, e) => { const f = fill(e); a.a += f.a; a.c += f.c; return a; }, { a: 0, c: 0 });
  const empty = events.length === 0 && (pastorals ?? 0) === 0;

  return (
    <>
      <Band title="Painel" sub={`Você está como ${ROLE_LABEL[role]}. Aqui fica o que precisa da sua atenção.`} parish={parish}
        action={<Link className="pill rent" href={`/p/${slug}/escalas`}>Escalas <Icon name="arrow" /></Link>} />
      <div className="workspace stack">
        <Flash ok={sp.ok} erro={sp.erro} />
        {empty && ctx.staff && (
          <div className="tile">
            <h3>Primeiros passos</h3>
            <ol className="muted" style={{ paddingLeft: 18, lineHeight: 1.9 }}>
              <li><Link href={`/p/${slug}/equipe`}>Crie as pastorais e as funções</Link> (ex.: Liturgia → Leitor, Ministro).</li>
              <li><Link href={`/p/${slug}/equipe`}>Convide o pároco, coordenadores e voluntários</Link>.</li>
              <li><Link href={`/p/${slug}/agenda`}>Cadastre as missas e eventos</Link> e monte as escalas.</li>
            </ol>
          </div>
        )}
        <section className="grid">
          <div className="tile c3 kpi"><h3><span className="ic"><Icon name="cal" /></span>Missas</h3><strong>{masses.length}</strong><small>nos próximos 7 dias</small></div>
          <div className="tile c3 kpi"><h3><span className="ic"><Icon name="swap" /></span>Escalas</h3><strong>{conf.a ? Math.round(conf.c / conf.a * 100) + '%' : '–'}</strong><small>presenças confirmadas na semana</small></div>
          <div className="tile c3 kpi"><h3><span className="ic"><Icon name="users" /></span>Pessoas</h3><strong>{members ?? 0}</strong><small>em {pl(pastorals ?? 0, 'pastoral', 'pastorais')}</small></div>
          <div className="tile c3 kpi"><h3><span className="ic"><Icon name="layers" /></span>Trocas</h3><strong>{swaps}</strong><small>pedidos de substituição</small></div>

          <div className="tile c7">
            <h3><span className="ic"><Icon name="cal" /></span>Próximos 7 dias <Link className="more" href={`/p/${slug}/agenda`}>Agenda →</Link></h3>
            {week.length ? (
              <ul className="list">{week.map(e => { const f = fill(e); return (
                <li key={e.id}><Link className="row-link" href={`/p/${slug}/escalas#e-${e.id}`}>
                  <div className="date"><b>{fmt(e.starts_at, { day: '2-digit' })}</b><small>{fmt(e.starts_at, { month: 'short' }).replace('.', '')}</small></div>
                  <div className="t"><b>{e.title}</b><small>{fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}</small></div>
                  {e.roster_slots.length ? <span className={`tag ${f.a < f.t ? 'warn' : 'ok'}`}>Escala {f.a}/{f.t}</span> : <span className="tag">{TYPE_LABEL[e.type]}</span>}
                </Link></li>); })}</ul>
            ) : <div className="empty-state"><b>Nada nos próximos 7 dias</b>Cadastre missas e eventos na Agenda.</div>}
          </div>

          <div className="tile c5">
            <h3><span className="ic"><Icon name="check" /></span>Minhas escalas</h3>
            {mine.length ? <ul className="list">{mine.map(({ e, s, a }) => (
              <li key={a.id} style={{ flexWrap: 'wrap' }}>
                <div className="t"><b>{s.roster_roles?.name} · {e.title}</b><small>{fmtDay(e.starts_at)}, {fmtTime(e.starts_at)} · <span className={`st-${a.status}`}>{STATUS_LABEL[a.status]}</span></small></div>
                {a.status !== 'confirmed' && (
                  <form action={respond}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="confirmed" />
                    <button className="btn sm primary">Confirmar</button></form>)}
                {a.status !== 'swap_requested' && (
                  <form action={respond}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="swap_requested" />
                    <button className="btn sm">Pedir troca</button></form>)}
              </li>))}</ul>
              : <div className="empty-state"><b>Você não está escalado</b>Quando a coordenação te escalar, aparece aqui para confirmar.</div>}
          </div>

          <div className="tile c12 help" style={{ gridColumn: 'span 12' }}>
            <h3><span className="ic"><Icon name="heart" /></span>Preciso de ajuda <Link className="more" style={{ color: 'rgba(255,255,255,.7)' }} href={`/p/${slug}/ajuda`}>Ver todos →</Link></h3>
            {help.length ? help.map(h => (
              <div className="need" key={h.id}><div><b>{h.needed} × {h.title}</b><small>{h.pastorals?.name}</small></div>
                <Link className="btn-gold" style={{ display: 'inline-grid', placeItems: 'center', textDecoration: 'none' }} href={`/p/${slug}/ajuda`}>Posso ajudar</Link></div>
            )) : <p>Nenhum pedido aberto. Quando uma pastoral precisar de ajuda, aparece aqui.</p>}
          </div>

          {(ctx.staff || ctx.coordinates.length > 0) && (
            <div className="tile c12 help" style={{ gridColumn: 'span 12' }}>
              <h3><span className="ic"><Icon name="users" /></span>Vagas nas escalas · próximos 30 dias</h3>
              {gaps.length ? gaps.slice(0, 6).map(({ e, s, n }) => (
                <div className="need" key={s.id}><div><b>{n} × {s.roster_roles?.name}</b><small>{e.title} · {fmtDay(e.starts_at)} {fmtTime(e.starts_at)}</small></div>
                  <Link className="btn-gold" style={{ display: 'inline-grid', placeItems: 'center', textDecoration: 'none' }} href={`/p/${slug}/escalas#e-${e.id}`}>Escalar</Link></div>
              )) : <p>Nenhuma vaga aberta.</p>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
