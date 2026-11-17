import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Ctx = Awaited<ReturnType<typeof getParish>>;

/** Carrega a paróquia pelo endereço e o papel de quem está logado. 404 para quem não é membro. */
export const getParish = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  const { data: parish } = await supabase.from('parishes').select('id, name, slug, city').eq('slug', slug).maybeSingle();
  if (!parish) notFound();
  const { data: m } = await supabase.from('memberships').select('role').eq('parish_id', parish.id).eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!m) notFound();
  const { data: coord } = await supabase.from('pastoral_members').select('pastoral_id').eq('parish_id', parish.id).eq('user_id', user.id).eq('is_coordinator', true).eq('active', true);
  const staff = m.role === 'parish_admin' || m.role === 'priest';
  return { supabase, user, parish, role: m.role as string, staff, coordinates: (coord ?? []).map(c => c.pastoral_id as string) };
});
