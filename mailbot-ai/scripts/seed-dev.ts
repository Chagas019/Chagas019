// Dados de DEMONSTRAÇÃO — somente ambiente de desenvolvimento.
// Uso: NODE_ENV=development SEED_USER_EMAIL=voce@exemplo.com npm run seed:dev
// Cria e-mails fictícios marcados como "demo-" para um usuário já cadastrado.
// Recusa rodar em produção e nunca marca a conta como conectada ao Gmail.
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  console.error('seed-dev: recusado em produção.');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;
if (!url || !key || !email) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SEED_USER_EMAIL.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 });
const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) { console.error('Usuário não encontrado. Faça login no app primeiro.'); process.exit(1); }

const { data: acc, error } = await sb.from('mailbot_gmail_accounts').upsert({
  user_id: user.id, email: 'demo@mailbot.dev', status: 'disconnected', initial_sync_done: true,
  last_error: 'Dados de demonstração (desenvolvimento). Conecte o Gmail real em Configurações.',
}, { onConflict: 'user_id' }).select('id').single();
if (error || !acc) { console.error('Falha ao criar conta demo', error?.message); process.exit(1); }

const h = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();
const demo = [
  { from: 'Carla Souza <carla@empresa-demo.com>', subject: 'Relatório trimestral até sexta', body: 'Oi! Preciso do relatório trimestral revisado até sexta às 17h para a reunião com a diretoria. Consegue?', at: h(2),
    s: { category: 'trabalho', priority: 'urgente', relevance_score: 92, summary: 'Carla pede o relatório trimestral revisado até sexta, 17h.', reason: 'Pedido direto da gestora com prazo em 2 dias', recommended_action: 'Responder confirmando o prazo', needs_reply: true, deadline: h(-48).slice(0, 10) } },
  { from: 'Banco Demo <faturas@banco-demo.com>', subject: 'Sua fatura vence em 3 dias', body: 'A fatura do seu cartão no valor de R$ 1.284,90 vence em 3 dias.', at: h(5),
    s: { category: 'financeiro', priority: 'importante', relevance_score: 85, summary: 'Fatura do cartão de R$ 1.284,90 vence em 3 dias.', reason: 'Cobrança com vencimento próximo', recommended_action: 'Pagar a fatura', is_bill: true, bill_amount: 'R$ 1.284,90', deadline: h(-72).slice(0, 10) } },
  { from: 'Clínica Demo <agenda@clinica-demo.com>', subject: 'Confirmação de consulta', body: 'Sua consulta está marcada para quinta-feira às 9h30.', at: h(9),
    s: { category: 'compromissos', priority: 'importante', relevance_score: 74, summary: 'Consulta marcada para quinta às 9h30.', reason: 'Compromisso pessoal agendado', recommended_action: 'Confirmar presença', is_appointment: true, appointment_at: h(-60) } },
  { from: 'Loja Demo <ofertas@loja-demo.com>', subject: 'Só hoje: 50% OFF', body: 'Promoção imperdível em toda a loja.', at: h(12),
    s: { category: 'informativos', priority: 'baixa', relevance_score: 5, summary: 'Promoção de 50% na loja.', reason: 'Mensagem promocional em massa', recommended_action: 'Pode ignorar' } },
];

for (const [i, d] of demo.entries()) {
  const m = d.from.match(/^(.*) <(.*)>$/)!;
  const { data: e, error: err } = await sb.from('mailbot_emails').upsert({
    user_id: user.id, account_id: acc.id, gmail_id: `demo-${i}`, thread_id: `demo-t${i}`, from_name: m[1], from_email: m[2],
    to_emails: user.email, subject: d.subject, snippet: d.body.slice(0, 120), body_text: d.body, received_at: d.at,
    label_ids: ['INBOX', 'UNREAD'], is_unread: true, content_hash: createHash('sha256').update(d.body).digest('hex'), triage_status: 'done',
  }, { onConflict: 'account_id,gmail_id' }).select('id').single();
  if (err || !e) { console.error(err?.message); continue; }
  await sb.from('mailbot_email_summaries').upsert({ email_id: e.id, user_id: user.id, source: 'rules', model: null, ...d.s });
}
console.log(`seed-dev: ${demo.length} e-mails de demonstração criados para ${email}.`);
