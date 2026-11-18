import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from('memberships').select('parishes(slug)').eq('active', true).order('created_at').limit(1);
  const slug = (data?.[0]?.parishes as unknown as { slug: string } | null)?.slug;
  redirect(slug ? `/p/${slug}` : '/comecar');
}
