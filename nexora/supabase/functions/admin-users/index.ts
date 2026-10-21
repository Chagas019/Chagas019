// Função de servidor (Supabase Edge Function) para operações privilegiadas: definir o papel de um usuário.
// A service_role key fica SOMENTE aqui, como segredo do projeto (supabase secrets), nunca no frontend.
// Deploy: supabase functions deploy admin-users
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json(401, { error: 'Não autenticado' });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: who, error: authError } = await admin.auth.getUser(token);
  if (authError || !who.user) return json(401, { error: 'Sessão inválida' });

  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).single();
  if (me?.role !== 'admin') return json(403, { error: 'Apenas administradores' });

  let body: { email?: string; role?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'JSON inválido' }); }
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['cliente', 'corretor', 'admin'].includes(role)) return json(400, { error: 'Dados inválidos' });

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return json(500, { error: 'Falha ao consultar usuários' });
  const target = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return json(404, { error: 'Usuário não encontrado. Peça para a pessoa criar a conta primeiro.' });
  if (target.id === who.user.id && role !== 'admin') return json(400, { error: 'Você não pode remover o próprio acesso de administrador.' });

  const { error } = await admin.from('profiles').update({ role }).eq('id', target.id);
  if (error) return json(500, { error: 'Falha ao atualizar o papel' });
  return json(200, { ok: true, email, role });
});
