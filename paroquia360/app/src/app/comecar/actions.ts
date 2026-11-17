'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { errMsg, slugify } from '@/lib/format';

export async function createParish(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim() || null;
  const diocese = String(formData.get('diocese') ?? '').trim() || null;
  const slug = slugify(String(formData.get('slug') ?? '') || name);
  if (name.length < 3 || slug.length < 3) redirect('/comecar?erro=' + encodeURIComponent('Informe o nome da paróquia.'));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_parish', { p_name: name, p_slug: slug, p_city: city, p_diocese: diocese });
  if (error) redirect('/comecar?erro=' + encodeURIComponent(errMsg(error.message)));
  redirect(`/p/${data}`);
}
