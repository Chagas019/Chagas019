import { headers } from 'next/headers';
import { getParish } from '@/lib/parish';
import { directory } from '@/lib/queries';
import { Band, Flash } from '@/components/Band';
import { initials, ROLE_LABEL, fmt } from '@/lib/format';
import { invite, cancelInvite, setRole, createPastoral, addToPastoral, createRosterRole, updateProfile, createSkill, toggleSkill, addAvailability, removeAvailability } from '../actions';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const metadata = { title: 'Equipe' };
const Hidden = ({ v }: { v: Record<string, string> }) => <>{Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}</>;
const sel = { height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface-2)', padding: '0 10px', color: 'var(--text)' } as const;

export default async function Equipe({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getParish(slug);
  const { supabase, parish, user, staff, role } = ctx;
  const isAdmin = role === 'parish_admin';
  const back = `/p/${slug}/equipe`;
  const base = { slug, back };
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;

  const [dir, me, members, invites, pastorals, pm, rroles, skills, mySkills, myAvail] = await Promise.all([
    directory(ctx),
    supabase.from('profiles').select('full_name, phone').eq('user_id', user.id).maybeSingle(),
    supabase.from('memberships').select('id, user_id, role').eq('parish_id', parish.id).eq('active', true),
    staff ? supabase.from('invitations').select('id, email, role, token, expires_at').eq('parish_id', parish.id).is('accepted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as never[] }),
    supabase.from('pastorals').select('id, name, description').eq('parish_id', parish.id).eq('active', true).order('name'),
    supabase.from('pastoral_members').select('pastoral_id, user_id, is_coordinator').eq('parish_id', parish.id).eq('active', true),
    supabase.from('roster_roles').select('id, name, pastoral_id').eq('parish_id', parish.id).order('name'),
    supabase.from('skills').select('id, name').eq('parish_id', parish.id).order('name'),
    supabase.from('volunteer_skills').select('skill_id').eq('parish_id', parish.id).eq('user_id', user.id),
    supabase.from('availability').select('id, weekday, start_time, end_time').eq('parish_id', parish.id).eq('user_id', user.id).not('weekday', 'is', null).order('weekday'),
  ]);
  const mine = new Set((mySkills.data ?? []).map(x => x.skill_id));
  const name = (id: string) => dir.get(id)?.display_name || 'Sem nome';
  const people = [...dir.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));

  return (
    <>
      <Band title="Equipe" sub="Pessoas, convites, pastorais e funções das escalas." parish={parish} />
      <div className="workspace">
        <Flash ok={sp.ok} erro={sp.erro} />
        <div className="split">
          <div className="stack">
            <section className="tile">
              <h3>Pastorais e funções</h3>
              {(pastorals.data ?? []).length === 0 && <div className="empty-state"><b>Nenhuma pastoral ainda</b>{staff ? 'Crie a primeira ao lado (ex.: Liturgia, Música, PASCOM).' : 'A administração ainda não criou pastorais.'}</div>}
              {(pastorals.data ?? []).map(p => {
                const mem = (pm.data ?? []).filter(m => m.pastoral_id === p.id);
                const manage = staff || ctx.coordinates.includes(p.id);
                return (
                  <div className="role-block" key={p.id}>
                    <header><b>{p.name}</b><small>{mem.length} pessoa{mem.length === 1 ? '' : 's'}</small></header>
                    <p className="muted" style={{ marginBottom: 8 }}>Funções: {(rroles.data ?? []).filter(r => r.pastoral_id === p.id).map(r => r.name).join(', ') || 'nenhuma'}</p>
                    <div className="people" style={{ marginBottom: 10 }}>
                      {mem.map(m => <div className="person" key={m.user_id}><span className="av">{initials(name(m.user_id))}</span><span className="t"><b>{name(m.user_id)}</b><small>{m.is_coordinator ? 'Coordenação' : 'Membro'}</small></span></div>)}
                    </div>
                    {manage && (
                      <div className="inline-form">
                        <form action={addToPastoral} className="inline-form">
                          <Hidden v={{ ...base, pastoral_id: p.id }} />
                          <select name="user_id" required style={sel} aria-label={`Adicionar pessoa em ${p.name}`}>
                            <option value="">Adicionar pessoa…</option>
                            {people.filter(x => !mem.some(m => m.user_id === x.user_id)).map(x => <option key={x.user_id} value={x.user_id}>{x.display_name || 'Sem nome'}</option>)}
                          </select>
                          {staff && <label className="muted"><input type="checkbox" name="coord" /> coordena</label>}
                          <button className="btn sm">Adicionar</button>
                        </form>
                        <form action={createRosterRole} className="inline-form">
                          <Hidden v={{ ...base, pastoral_id: p.id }} />
                          <input name="name" required minLength={2} maxLength={60} placeholder="Nova função (ex.: Leitor)" style={sel} aria-label={`Nova função em ${p.name}`} />
                          <button className="btn sm">Criar função</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="tile">
              <h3>Pessoas ({(members.data ?? []).length || people.length})</h3>
              <ul className="list">
                {((members.data ?? []).length ? members.data! : people.map(p => ({ id: p.user_id, user_id: p.user_id, role: p.role }))).map(m => (
                  <li key={m.id}>
                    <span className="person" style={{ background: 'none', padding: 0 }}><span className="av">{initials(name(m.user_id))}</span></span>
                    <div className="t"><b>{name(m.user_id)}{m.user_id === user.id ? ' (você)' : ''}</b><small>{ROLE_LABEL[m.role]}</small></div>
                    {isAdmin && m.user_id !== user.id && (
                      <form action={setRole} className="inline-form"><Hidden v={{ ...base, id: m.id }} />
                        <select name="role" defaultValue={m.role} style={sel} aria-label={`Papel de ${name(m.user_id)}`}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                        <button className="btn sm">Salvar</button></form>)}
                  </li>))}
              </ul>
            </section>
          </div>

          <aside className="stack">
            <section className="tile">
              <h3>Seu perfil</h3>
              <form action={updateProfile}>
                <Hidden v={base} />
                <label className="field">Nome<input name="full_name" required minLength={2} maxLength={120} defaultValue={me.data?.full_name ?? ''} /></label>
                <label className="field">Telefone (opcional)<input name="phone" type="tel" maxLength={20} defaultValue={me.data?.phone ?? ''} /></label>
                <button className="btn primary block">Salvar perfil</button>
              </form>
            </section>
            <section className="tile">
              <h3>Seus talentos</h3>
              {(skills.data ?? []).length === 0 ? <p className="muted">{staff ? 'Cadastre os talentos da paróquia logo abaixo.' : 'A administração ainda não cadastrou talentos.'}</p> : (
                <div className="inline-form">
                  {(skills.data ?? []).map(k => (
                    <form action={toggleSkill} key={k.id}><Hidden v={{ ...base, skill_id: k.id, on: mine.has(k.id) ? '0' : '1' }} />
                      <button className={`btn sm${mine.has(k.id) ? ' primary' : ''}`} aria-pressed={mine.has(k.id)}>{mine.has(k.id) ? '✓ ' : ''}{k.name}</button></form>
                  ))}
                </div>
              )}
              {staff && (
                <form action={createSkill} className="inline-form" style={{ marginTop: 12 }}>
                  <Hidden v={base} />
                  <input name="name" required minLength={2} maxLength={60} placeholder="Novo talento (ex.: Fotografia)" style={sel} aria-label="Novo talento" />
                  <button className="btn sm">Adicionar ao catálogo</button>
                </form>
              )}
            </section>
            <section className="tile">
              <h3>Quando você pode servir</h3>
              {(myAvail.data ?? []).length === 0 && <p className="muted" style={{ marginBottom: 10 }}>Informe os dias e horários em que costuma estar livre. A coordenação usa isso para sugerir quem escalar.</p>}
              <ul className="list">
                {(myAvail.data ?? []).map(a => (
                  <li key={a.id}><div className="t"><b>{DAYS[a.weekday as number]}</b><small>{String(a.start_time).slice(0, 5)} às {String(a.end_time).slice(0, 5)}</small></div>
                    <form action={removeAvailability}><Hidden v={{ ...base, id: a.id }} /><button className="icon-btn" aria-label={`Remover ${DAYS[a.weekday as number]}`}>✕</button></form></li>
                ))}
              </ul>
              <form action={addAvailability} className="inline-form" style={{ marginTop: 8 }}>
                <Hidden v={base} />
                <select name="weekday" style={sel} aria-label="Dia da semana">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
                <input type="time" name="start" defaultValue="07:00" required style={sel} aria-label="Início" />
                <input type="time" name="end" defaultValue="12:00" required style={sel} aria-label="Fim" />
                <button className="btn sm">Adicionar</button>
              </form>
            </section>
            {staff && (
              <section className="tile">
                <h3>Convidar pessoa</h3>
                <form action={invite}>
                  <Hidden v={base} />
                  <label className="field">E-mail<input name="email" type="email" required /></label>
                  <label className="field">Papel<select name="role" defaultValue="volunteer">{Object.entries(ROLE_LABEL).filter(([k]) => isAdmin || k !== 'parish_admin').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                  <button className="btn primary block">Criar convite</button>
                </form>
                <p className="muted" style={{ marginTop: 10 }}>O sistema ainda não envia e-mail: copie o link e mande pela conversa que preferir. Ele vale 14 dias e só funciona para o e-mail convidado.</p>
                {(invites.data ?? []).map(i => (
                  <div key={i.id} style={{ marginTop: 14 }}>
                    <b style={{ fontWeight: 500 }}>{i.email}</b> <span className="tag">{ROLE_LABEL[i.role]}</span>
                    <div className="code" style={{ marginTop: 6 }}>{origin}/convite/{i.token}</div>
                    <form action={cancelInvite} style={{ marginTop: 6 }}><Hidden v={{ ...base, id: i.id }} /><span className="muted">vence {fmt(i.expires_at, { day: 'numeric', month: 'short' })} · </span><button className="muted" style={{ textDecoration: 'underline' }}>cancelar</button></form>
                  </div>
                ))}
              </section>
            )}
            {staff && (
              <section className="tile">
                <h3>Nova pastoral</h3>
                <form action={createPastoral}>
                  <Hidden v={base} />
                  <label className="field">Nome<input name="name" required minLength={2} maxLength={80} placeholder="Liturgia" /></label>
                  <label className="field">Descrição (opcional)<input name="description" maxLength={200} /></label>
                  <button className="btn block">Criar pastoral</button>
                </form>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
