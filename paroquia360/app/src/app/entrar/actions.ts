'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/format';

const val = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const back = (modo: string, next: string, erro: string, email = '') =>
  `/entrar?modo=${modo}&erro=${encodeURIComponent(erro)}&next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;

export async function login(f: FormData) {
  const email = val(f, 'email').toLowerCase(), password = String(f.get('password') ?? ''), next = safeNext(f.get('next'));
  if (!email || !password) redirect(back('entrar', next, 'Digite seu e-mail e sua senha.', email));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(back('entrar', next, /invalid/i.test(error.message) ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar agora. Tente de novo.', email));
  redirect(next);
}

export async function signup(f: FormData) {
  const name = val(f, 'name'), email = val(f, 'email').toLowerCase(), password = String(f.get('password') ?? ''), next = safeNext(f.get('next'));
  if (!f.get('consent')) redirect(back('criar', next, 'Para continuar, aceite a política de privacidade.', email));
  if (password !== String(f.get('password2') ?? '')) redirect(back('criar', next, 'As duas senhas não são iguais.', email));
  const supabase = await createClient();
  const { error } = await supabase.rpc('sign_up', { p_email: email, p_password: password, p_name: name });
  if (error) redirect(back('criar', next, error.message, email));
  const { data, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
  if (e2) redirect(back('entrar', next, 'Conta criada. Entre com seu e-mail e senha.', email));
  await supabase.from('profiles').update({ privacy_consent_at: new Date().toISOString() }).eq('user_id', data.user.id).is('privacy_consent_at', null);
  redirect(next);
}
