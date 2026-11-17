import type { Ctx } from './parish';

export type Person = { user_id: string; display_name: string; role: string };
export type Slot = { id: string; quantity: number; roster_roles: { name: string; pastoral_id: string } | null; roster_assignments: { id: string; user_id: string; status: string }[] };
export type Ev = { id: string; title: string; type: string; location: string | null; starts_at: string; pastoral_id: string | null; roster_slots: Slot[] };

export async function upcomingEvents(ctx: Ctx, days: number, fromIso = new Date().toISOString()) {
  const until = new Date(new Date(fromIso).getTime() + days * 864e5).toISOString();
  const { data } = await ctx.supabase.from('events')
    .select('id, title, type, location, starts_at, pastoral_id, roster_slots(id, quantity, roster_roles(name, pastoral_id), roster_assignments(id, user_id, status))')
    .eq('parish_id', ctx.parish.id).gte('starts_at', fromIso).lt('starts_at', until).order('starts_at');
  return (data ?? []) as unknown as Ev[];
}

export async function directory(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc('parish_directory', { p: ctx.parish.id });
  const rows = (data ?? []) as Person[];
  return new Map<string, Person>(rows.map(d => [d.user_id, d]));
}

export const fill = (e: Ev) => e.roster_slots.reduce((a, s) => {
  a.t += s.quantity; a.a += s.roster_assignments.length; a.c += s.roster_assignments.filter(x => x.status === 'confirmed').length; return a;
}, { a: 0, t: 0, c: 0 });

export const canManage = (ctx: Ctx, pastoralId: string | null | undefined) => ctx.staff || (!!pastoralId && ctx.coordinates.includes(pastoralId));
