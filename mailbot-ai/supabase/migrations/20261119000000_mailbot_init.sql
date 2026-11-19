-- MAILBOT AI — schema inicial
-- Tabelas do usuário com Row Level Security (cada usuário só enxerga os próprios dados).
-- Tabelas internas (tokens, cache, rate limit) têm RLS ligado e NENHUMA policy:
-- só o backend (service role) acessa.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------- UserPreferences
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  sync_frequency_minutes int not null default 60 check (sync_frequency_minutes in (0, 15, 30, 60, 180, 360, 720, 1440)),
  daily_report_hour int not null default 7 check (daily_report_hour between 0 and 23),
  initial_sync_days int not null default 90 check (initial_sync_days between 0 and 3650), -- 0 = todas
  vip_senders text[] not null default '{}',
  work_domains text[] not null default '{}',
  ignored_senders text[] not null default '{}',
  ai_daily_budget_usd numeric(10,4) not null default 0.50 check (ai_daily_budget_usd >= 0 and ai_daily_budget_usd <= 50),
  last_daily_report_on date,
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- GmailAccounts
create table public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'connected' check (status in ('connected', 'reauth_required', 'disconnected', 'error')),
  history_id text,
  initial_sync_done boolean not null default false,
  initial_sync_page_token text,
  messages_total int,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Tokens OAuth criptografados (AES-256-GCM na aplicação). Sem policies: só service role.
create table public.gmail_tokens (
  account_id uuid primary key references public.gmail_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_enc text not null,
  access_token_enc text,
  access_token_expires_at timestamptz,
  scope text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- EmailCategories
create table public.email_categories (
  slug text primary key,
  label text not null,
  description text not null,
  derived boolean not null default false, -- true = calculada pela prioridade/flags, não pela categoria
  sort int not null
);

insert into public.email_categories (slug, label, description, derived, sort) values
  ('urgentes',     'Urgentes',              'Prazos próximos, problemas importantes, atenção imediata', true, 1),
  ('responder',    'Precisam de resposta',  'Alguém espera uma resposta sua',                            true, 2),
  ('trabalho',     'Trabalho',              'Assuntos profissionais, clientes e projetos',               false, 3),
  ('financeiro',   'Financeiro',            'Cobranças, pagamentos, faturas, bancos',                    false, 4),
  ('pessoal',      'Pessoais',              'Família, amigos e assuntos pessoais relevantes',            false, 5),
  ('compromissos', 'Compromissos',          'Reuniões, eventos, consultas e agendamentos',               false, 6),
  ('informativos', 'Informativos',          'Newsletters, notificações e comunicações sem ação',         false, 7);

-- ---------------------------------------------------------------- Emails
create table public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.gmail_accounts(id) on delete cascade,
  gmail_id text not null,
  thread_id text not null,
  from_name text,
  from_email text not null default '',
  to_emails text not null default '',
  subject text not null default '',
  snippet text not null default '',
  body_text text not null default '',
  received_at timestamptz not null,
  label_ids text[] not null default '{}',
  is_unread boolean not null default false,
  is_sent boolean not null default false,
  has_list_unsubscribe boolean not null default false,
  content_hash text not null,
  triage_status text not null default 'pending' check (triage_status in ('pending', 'done', 'skipped', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(from_name, '') || ' ' || coalesce(from_email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(left(body_text, 20000), '')), 'C')
  ) stored,
  unique (account_id, gmail_id)
);
create index emails_user_received_idx on public.emails (user_id, received_at desc);
create index emails_user_thread_idx on public.emails (user_id, thread_id);
create index emails_user_triage_idx on public.emails (user_id, triage_status) where triage_status = 'pending';
create index emails_user_from_idx on public.emails (user_id, from_email);
create index emails_search_idx on public.emails using gin (search);

-- ---------------------------------------------------------------- EmailSummaries (resultado do MAIL TRIAGE)
create table public.email_summaries (
  email_id uuid primary key references public.emails(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null references public.email_categories(slug),
  priority text not null check (priority in ('urgente', 'importante', 'normal', 'baixa', 'spam')),
  relevance_score int not null check (relevance_score between 0 and 100),
  summary text not null,
  reason text not null default '',
  recommended_action text not null default '',
  needs_reply boolean not null default false,
  deadline date,
  is_bill boolean not null default false,
  bill_amount text,
  is_appointment boolean not null default false,
  appointment_at timestamptz,
  source text not null check (source in ('rules', 'ai', 'cache')),
  model text,
  created_at timestamptz not null default now()
);
create index email_summaries_user_priority_idx on public.email_summaries (user_id, priority, relevance_score desc);
create index email_summaries_user_category_idx on public.email_summaries (user_id, category);

-- ---------------------------------------------------------------- AIConversations / Messages
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  agent text check (agent in ('triage', 'summary', 'chat')),
  route text,
  refs jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index ai_conv_messages_conv_idx on public.ai_conversation_messages (conversation_id, created_at);

-- ---------------------------------------------------------------- DailyReports (MAIL SUMMARY)
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily', 'weekly')),
  period_start date not null,
  period_end date not null,
  content jsonb not null,
  narrative text not null default '',
  email_count int not null default 0,
  source_fingerprint text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, period_start)
);

-- ---------------------------------------------------------------- SyncHistory
create table public.sync_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.gmail_accounts(id) on delete cascade,
  kind text not null check (kind in ('initial', 'incremental', 'full_resync')),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error')),
  fetched int not null default 0,
  added int not null default 0,
  updated int not null default 0,
  deleted int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index sync_history_user_idx on public.sync_history (user_id, started_at desc);

-- ---------------------------------------------------------------- Consumo de IA (custos por agente/usuário)
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text not null check (agent in ('triage', 'summary', 'chat')),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_user_day_idx on public.ai_usage (user_id, created_at desc);

-- Cache de resultados de IA (chave inclui o user_id). Sem policies: só service role.
create table public.ai_cache (
  key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Rate limiting (janela fixa). Sem policies: só service role.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end $$;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.gmail_accounts enable row level security;
alter table public.gmail_tokens enable row level security;
alter table public.email_categories enable row level security;
alter table public.emails enable row level security;
alter table public.email_summaries enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;
alter table public.daily_reports enable row level security;
alter table public.sync_history enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_cache enable row level security;
alter table public.rate_limits enable row level security;

-- Leitura: somente o dono
create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own prefs" on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "own account" on public.gmail_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "categories readable" on public.email_categories for select to authenticated using (true);
create policy "own emails" on public.emails for select to authenticated using (user_id = (select auth.uid()));
create policy "own summaries" on public.email_summaries for select to authenticated using (user_id = (select auth.uid()));
create policy "own conversations" on public.ai_conversations for select to authenticated using (user_id = (select auth.uid()));
create policy "own conversations delete" on public.ai_conversations for delete to authenticated using (user_id = (select auth.uid()));
create policy "own conv messages" on public.ai_conversation_messages for select to authenticated using (user_id = (select auth.uid()));
create policy "own reports" on public.daily_reports for select to authenticated using (user_id = (select auth.uid()));
create policy "own sync history" on public.sync_history for select to authenticated using (user_id = (select auth.uid()));
create policy "own ai usage" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
-- Escritas (preferências, sync, classificação, chat) passam pelas rotas de API do servidor,
-- que validam a entrada, aplicam rate limit e gravam com o user_id da sessão.

-- Tokens nunca expostos via API pública
revoke all on public.gmail_tokens, public.ai_cache, public.rate_limits from anon, authenticated;
