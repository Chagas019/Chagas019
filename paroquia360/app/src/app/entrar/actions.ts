'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/format';

export async function sendLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const next = safeNext(formData.get('next'));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`/entrar?erro=email&next=${encodeURIComponent(next)}`);
  if (!formData.get('consent')) redirect(`/entrar?erro=consent&next=${encodeURIComponent(next)}`);
  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  // Pedido repetido em menos de 60 s: o link anterior já foi enviado.
  if (error && /seconds/i.test(error.message)) redirect(`/entrar?enviado=1&repetido=1`);
  // Limite de e-mails por hora do servidor de e-mail do projeto: nenhum e-mail foi enviado.
  if (error && (error.status === 429 || /rate limit/i.test(error.message))) redirect(`/entrar?erro=limite&next=${encodeURIComponent(next)}`);
  if (error) redirect(`/entrar?erro=envio&next=${encodeURIComponent(next)}`);
  redirect(`/entrar?enviado=1`);
}
