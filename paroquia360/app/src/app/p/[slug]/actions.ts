'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getParish } from '@/lib/parish';
import { errMsg, safeNext, toIso } from '@/lib/format';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const back = (f: FormData, slug: string) => safeNext(s(f, 'back') || `/p/${slug}`);

async function run(f: FormData, ok: string, op: (c: Awaited<ReturnType<typeof getParish>>) => PromiseLike<{ error: { message: string } | null }>) {
  const slug = s(f, 'slug');
  const ctx = await getParish(slug);
  const { error } = await op(ctx);
  const to = back(f, slug), sep = to.includes('?') ? '&' : '?';
  revalidatePath(`/p/${slug}`, 'layout');
  redirect(error ? `${to}${sep}erro=${encodeURIComponent(errMsg(error.message))}` : `${to}${sep}ok=${encodeURIComponent(ok)}`);
}

/* ---------- escalas: resposta do próprio voluntário ---------- */
export async function respond(f: FormData) {
  const status = s(f, 'status');
  if (!['confirmed', 'swap_requested', 'declined'].includes(status)) return;
  await run(f, status === 'confirmed' ? 'Presença confirmada.' : 'Pedido enviado à coordenação.', ({ supabase, user }) =>
    supabase.from('roster_assignments').update({ status: status as 'confirmed', swap_note: s(f, 'note') || null })
      .eq('id', s(f, 'id')).eq('user_id', user.id));
}

/* ---------- escalas: coordenação ---------- */
export async function addSlot(f: FormData) {
  const qty = Math.min(50, Math.max(1, Number(s(f, 'quantity')) || 1));
  await run(f, 'Função adicionada à celebração.', ({ supabase, parish }) =>
    supabase.from('roster_slots').insert({ parish_id: parish.id, event_id: s(f, 'event_id'), roster_role_id: s(f, 'role_id'), quantity: qty }));
}
export async function assign(f: FormData) {
  await run(f, 'Pessoa escalada — aguardando confirmação.', ({ supabase, parish, user }) =>
    supabase.from('roster_assignments').insert({ parish_id: parish.id, slot_id: s(f, 'slot_id'), user_id: s(f, 'user_id'), assigned_by: user.id }));
}
export async function unassign(f: FormData) {
  await run(f, 'Pessoa retirada da escala.', ({ supabase }) => supabase.from('roster_assignments').delete().eq('id', s(f, 'id')));
}
export async function markConfirmed(f: FormData) {
  await run(f, 'Confirmação registrada.', ({ supabase }) => supabase.from('roster_assignments').update({ status: 'confirmed' }).eq('id', s(f, 'id')));
}

/* ---------- agenda ---------- */
export async function createEvent(f: FormData) {
  const date = s(f, 'date'), time = s(f, 'time');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || s(f, 'title').length < 2) {
    redirect(`${back(f, s(f, 'slug'))}?erro=${encodeURIComponent('Preencha título, data e horário.')}`);
  }
  await run(f, 'Evento criado.', ({ supabase, parish, user }) =>
    supabase.from('events').insert({
      parish_id: parish.id, created_by: user.id, title: s(f, 'title'), type: s(f, 'type') as 'mass',
      location: s(f, 'location') || null, pastoral_id: s(f, 'pastoral_id') || null, starts_at: toIso(date, time),
    }));
}
export async function deleteEvent(f: FormData) {
  await run(f, 'Evento excluído.', ({ supabase }) => supabase.from('events').delete().eq('id', s(f, 'id')));
}

/* ---------- equipe ---------- */
export async function invite(f: FormData) {
  const email = s(f, 'email').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`${back(f, s(f, 'slug'))}?erro=${encodeURIComponent('E-mail inválido.')}`);
  await run(f, 'Convite criado. Copie o link e envie para a pessoa.', ({ supabase, parish, user }) =>
    supabase.from('invitations').insert({ parish_id: parish.id, email, role: s(f, 'role') as 'volunteer', invited_by: user.id }));
}
export async function cancelInvite(f: FormData) {
  await run(f, 'Convite cancelado.', ({ supabase }) => supabase.from('invitations').delete().eq('id', s(f, 'id')));
}
export async function setRole(f: FormData) {
  await run(f, 'Papel atualizado.', ({ supabase }) => supabase.from('memberships').update({ role: s(f, 'role') as 'volunteer' }).eq('id', s(f, 'id')));
}
export async function createPastoral(f: FormData) {
  await run(f, 'Pastoral criada.', ({ supabase, parish }) =>
    supabase.from('pastorals').insert({ parish_id: parish.id, name: s(f, 'name'), description: s(f, 'description') || null }));
}
export async function addToPastoral(f: FormData) {
  await run(f, 'Pessoa adicionada à pastoral.', ({ supabase, parish }) =>
    supabase.from('pastoral_members').upsert({ parish_id: parish.id, pastoral_id: s(f, 'pastoral_id'), user_id: s(f, 'user_id'), is_coordinator: f.get('coord') === 'on', active: true }));
}
export async function createRosterRole(f: FormData) {
  await run(f, 'Função criada.', ({ supabase, parish }) =>
    supabase.from('roster_roles').insert({ parish_id: parish.id, pastoral_id: s(f, 'pastoral_id'), name: s(f, 'name') }));
}
export async function updateProfile(f: FormData) {
  await run(f, 'Perfil atualizado.', ({ supabase, user }) =>
    supabase.from('profiles').update({ full_name: s(f, 'full_name'), phone: s(f, 'phone') || null }).eq('user_id', user.id));
}

/* ---------- talentos e disponibilidade ---------- */
export async function createSkill(f: FormData) {
  await run(f, 'Talento adicionado ao catálogo.', ({ supabase, parish }) =>
    supabase.from('skills').insert({ parish_id: parish.id, name: s(f, 'name') }));
}
export async function toggleSkill(f: FormData) {
  const on = s(f, 'on') === '1';
  await run(f, on ? 'Talento marcado.' : 'Talento desmarcado.', ({ supabase, parish, user }) =>
    on ? supabase.from('volunteer_skills').insert({ parish_id: parish.id, user_id: user.id, skill_id: s(f, 'skill_id') })
       : supabase.from('volunteer_skills').delete().eq('user_id', user.id).eq('skill_id', s(f, 'skill_id')));
}
export async function addAvailability(f: FormData) {
  const wd = Number(s(f, 'weekday')), start = s(f, 'start'), end = s(f, 'end');
  if (!(wd >= 0 && wd <= 6) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) {
    redirect(`${back(f, s(f, 'slug'))}?erro=${encodeURIComponent('Escolha o dia e um horário de fim depois do início.')}`);
  }
  await run(f, 'Disponibilidade salva.', ({ supabase, parish, user }) =>
    supabase.from('availability').insert({ parish_id: parish.id, user_id: user.id, weekday: wd, start_time: start, end_time: end }));
}
export async function removeAvailability(f: FormData) {
  await run(f, 'Horário removido.', ({ supabase, user }) => supabase.from('availability').delete().eq('id', s(f, 'id')).eq('user_id', user.id));
}

/* ---------- preciso de ajuda ---------- */
export async function createHelpRequest(f: FormData) {
  const needed = Math.min(50, Math.max(1, Number(s(f, 'needed')) || 1));
  if (s(f, 'title').length < 2 || !s(f, 'pastoral_id')) redirect(`${back(f, s(f, 'slug'))}?erro=${encodeURIComponent('Informe o que precisa e a pastoral.')}`);
  await run(f, 'Pedido publicado. Quem tem o talento já pode se oferecer.', ({ supabase, parish, user }) =>
    supabase.from('help_requests').insert({
      parish_id: parish.id, created_by: user.id, pastoral_id: s(f, 'pastoral_id'), title: s(f, 'title'),
      description: s(f, 'description') || null, event_id: s(f, 'event_id') || null, skill_id: s(f, 'skill_id') || null, needed,
    }));
}
export async function setHelpStatus(f: FormData) {
  const st = s(f, 'status');
  if (!['open', 'filled', 'cancelled'].includes(st)) return;
  await run(f, st === 'open' ? 'Pedido reaberto.' : st === 'filled' ? 'Pedido marcado como atendido.' : 'Pedido cancelado.', ({ supabase }) =>
    supabase.from('help_requests').update({ status: st as 'open' }).eq('id', s(f, 'id')));
}
export async function offerHelp(f: FormData) {
  const existing = s(f, 'offer_id');
  await run(f, 'Obrigado! A coordenação vai ver sua oferta.', ({ supabase, parish, user }) =>
    existing ? supabase.from('help_offers').update({ status: 'offered' }).eq('id', existing).eq('user_id', user.id)
             : supabase.from('help_offers').insert({ parish_id: parish.id, help_request_id: s(f, 'request_id'), user_id: user.id }));
}
export async function withdrawOffer(f: FormData) {
  await run(f, 'Oferta retirada.', ({ supabase, user }) =>
    supabase.from('help_offers').update({ status: 'withdrawn' }).eq('id', s(f, 'offer_id')).eq('user_id', user.id));
}
export async function decideOffer(f: FormData) {
  const st = s(f, 'status');
  if (!['accepted', 'declined'].includes(st)) return;
  await run(f, st === 'accepted' ? 'Oferta aceita — combine os detalhes com a pessoa.' : 'Oferta recusada.', ({ supabase }) =>
    supabase.from('help_offers').update({ status: st as 'accepted' }).eq('id', s(f, 'offer_id')));
}
