import Link from 'next/link';
import { getParish } from '@/lib/parish';
import { upcomingEvents, directory, fill, canManage } from '@/lib/queries';
import { Band, Flash } from '@/components/Band';
import { fmt, fmtTime, initials, pl, STATUS_LABEL } from '@/lib/format';
import { addSlot, assign, unassign, markConfirmed, respond } from '../actions';

export const metadata = { title: 'Escalas' };

const Hidden = ({ v }: { v: Record<string, string> }) => <>{Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}</>;

export default async function Escalas({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; erro?: string; dias?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getParish(slug);
  const dias = sp.dias === '90' ? 90 : 30;
  const [events, dir, rolesRes] = await Promise.all([
    upcomingEvents(ctx, dias), directory(ctx),
    ctx.supabase.from('roster_roles').select('id, name, pastoral_id, pastorals(name)').eq('parish_id', ctx.parish.id).order('name'),
  ]);
  const roles = (rolesRes.data ?? []) as unknown as { id: string; name: string; pastoral_id: string; pastorals: { name: string } | null }[];
  const myRoles = roles.filter(r => canManage(ctx, r.pastoral_id));
  const people = [...dir.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));
  const back = `/p/${slug}/escalas${dias === 90 ? '?dias=90' : ''}`;
  const base = { slug, back };

  return (
    <>
      <Band title="Escalas" sub="Monte, acompanhe e confirme sem grupo de mensagem." parish={ctx.parish}
        action={<Link className="pill rent" href={dias === 30 ? `/p/${slug}/escalas?dias=90` : `/p/${slug}/escalas`}>{dias === 30 ? 'Ver 90 dias' : 'Ver 30 dias'}</Link>} />
      <div className="workspace stack">
        <Flash ok={sp.ok} erro={sp.erro} />
        {roles.length === 0 && ctx.staff && <div className="notice info">Antes de montar escalas, crie as funções (Leitor, Ministro…) em <Link href={`/p/${slug}/equipe`}>Equipe</Link>.</div>}
        {events.length === 0 && <div className="empty-state"><b>Nenhuma celebração nos próximos {dias} dias</b>Cadastre na <Link href={`/p/${slug}/agenda`}>Agenda</Link>.</div>}
        {events.map(e => {
          const f = fill(e);
          const inEvent = new Set(e.roster_slots.flatMap(s => s.roster_assignments.map(a => a.user_id)));
          const usedRoles = new Set(e.roster_slots.map(s => s.roster_roles?.name));
          const addable = myRoles.filter(r => !usedRoles.has(r.name));
          return (
            <section className="tile" key={e.id} id={`e-${e.id}`}>
              <div className="ev-head">
                <div><h2>{e.title}</h2>
                  <p className="muted">{fmt(e.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}, {fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}
                    {f.t > 0 && ` · ${pl(f.c, 'confirmado', 'confirmados')}, ${f.a - f.c} aguardando, ${pl(f.t - f.a, 'vaga', 'vagas')}`}</p></div>
              </div>
              {e.roster_slots.length === 0 && <p className="muted">Sem escala para esta celebração.</p>}
              {e.roster_slots.map(s => {
                const manage = canManage(ctx, s.roster_roles?.pastoral_id);
                const free = s.quantity - s.roster_assignments.length;
                return (
                  <div className="role-block" key={s.id}>
                    <header><b>{s.roster_roles?.name}</b><small>{s.roster_assignments.length}/{s.quantity}</small></header>
                    <div className="people">
                      {s.roster_assignments.map(a => {
                        const name = dir.get(a.user_id)?.display_name || 'Pessoa';
                        const me = a.user_id === ctx.user.id;
                        return (
                          <div className={`person ${a.status === 'swap_requested' ? 'swap' : ''}`} key={a.id}>
                            <span className="av">{initials(name)}</span>
                            <span className="t"><b>{name}{me ? ' (você)' : ''}</b><small className={`st-${a.status}`}>{STATUS_LABEL[a.status]}</small></span>
                            {me && a.status !== 'confirmed' && <form action={respond}><Hidden v={{ ...base, id: a.id, status: 'confirmed' }} /><button className="btn sm primary">Confirmar</button></form>}
                            {me && a.status === 'pending' && <form action={respond}><Hidden v={{ ...base, id: a.id, status: 'swap_requested' }} /><button className="btn sm">Pedir troca</button></form>}
                            {manage && !me && a.status === 'pending' && <form action={markConfirmed}><Hidden v={{ ...base, id: a.id }} /><button className="icon-btn" title="Registrar confirmação" aria-label={`Registrar confirmação de ${name}`}>✓</button></form>}
                            {manage && <form action={unassign}><Hidden v={{ ...base, id: a.id }} /><button className="icon-btn" title="Tirar da escala" aria-label={`Tirar ${name} da escala`}>✕</button></form>}
                          </div>
                        );
                      })}
                      {manage && free > 0 && (
                        <form action={assign} className="inline-form slot-empty" style={{ padding: 8 }}>
                          <Hidden v={{ ...base, slot_id: s.id }} />
                          <select name="user_id" required aria-label={`Escolher ${s.roster_roles?.name}`} className="field" style={{ height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', padding: '0 10px', flex: 1 }}>
                            <option value="">Escalar… ({free} vaga{free > 1 ? 's' : ''})</option>
                            {people.filter(p => !inEvent.has(p.user_id)).map(p => <option key={p.user_id} value={p.user_id}>{p.display_name || 'Sem nome'}</option>)}
                          </select>
                          <button className="btn sm primary">Escalar</button>
                        </form>
                      )}
                      {!manage && free > 0 && <div className="slot-empty">{free} vaga{free > 1 ? 's' : ''} aberta{free > 1 ? 's' : ''}</div>}
                    </div>
                  </div>
                );
              })}
              {addable.length > 0 && (
                <form action={addSlot} className="inline-form" style={{ marginTop: 12 }}>
                  <Hidden v={{ ...base, event_id: e.id }} />
                  <label className="field">Adicionar função<select name="role_id" required>{addable.map(r => <option key={r.id} value={r.id}>{r.name} · {r.pastorals?.name}</option>)}</select></label>
                  <label className="field" style={{ maxWidth: 110 }}>Vagas<input type="number" name="quantity" min={1} max={50} defaultValue={2} /></label>
                  <button className="btn">Adicionar</button>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
