-- Variante para banco Supabase compartilhado: tudo no schema "jarvis" (aplicada em 2026-11-20 no projeto existente).
-- Backend: DATABASE_SCHEMA=jarvis e DATABASE_URL do pooler em modo sessão (porta 5432).
create schema if not exists jarvis;
revoke all on schema jarvis from anon, authenticated;
set search_path to jarvis, public, extensions;
-- JARVIS v2 — esquema inicial.
-- user_id é `text` (não FK para auth.users) para permitir o usuário de desenvolvimento "dev-user";
-- em produção contém o `sub` (uuid) do Supabase Auth. O backend usa conexão de serviço (ignora RLS);
-- RLS protege qualquer acesso direto via cliente (anon/authenticated).


create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx on conversations (user_id, updated_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_created_idx on messages (conversation_id, created_at);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null check (kind in ('fact','preference','summary')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists memories_user_created_idx on memories (user_id, created_at desc);
create index if not exists memories_content_fts_idx on memories using gin (to_tsvector('portuguese', content));

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  notes text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_status_idx on tasks (user_id, status, created_at desc);

create table if not exists usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(14,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_created_idx on usage_records (user_id, created_at desc);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  actor text not null,
  action text not null,
  status text not null check (status in ('ok','denied','error','pending_confirmation')),
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_user_created_idx on audit_events (user_id, created_at desc);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  apns_token text not null,
  platform text not null default 'ios' check (platform = 'ios'),
  created_at timestamptz not null default now(),
  unique (user_id, apns_token)
);

-- Tokens SEMPRE cifrados pelo backend (AES-256-GCM); nunca expostos ao cliente.
create table if not exists integration_tokens (
  user_id text not null,
  provider text not null check (provider in ('google')),
  encrypted text not null,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;
alter table memories enable row level security;
alter table tasks enable row level security;
alter table usage_records enable row level security;
alter table audit_events enable row level security;
alter table devices enable row level security;
alter table integration_tokens enable row level security;

create policy conversations_owner on conversations for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy messages_owner on messages for all
  using (exists (select 1 from conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()::text))
  with check (exists (select 1 from conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()::text));
create policy memories_owner on memories for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy tasks_owner on tasks for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy usage_owner on usage_records for select using (user_id = auth.uid()::text);
create policy audit_owner on audit_events for select using (user_id = auth.uid()::text);
create policy devices_owner on devices for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
-- integration_tokens: sem policy = nenhum acesso via cliente (apenas conexão de serviço).
-- JARVIS v2 — endurecimento de segurança (T09, achado F-01).
-- O cliente (anon/authenticated via PostgREST) só pode LER as próprias linhas. Toda escrita passa pelo backend
-- (conexão de serviço, que ignora RLS), com rate limit, limite de corpo, orçamento e confirmação de ações.
-- Isso impede forjar `messages.meta.pending` e burlar limites gravando direto no banco.

drop policy if exists conversations_owner on conversations;
drop policy if exists messages_owner on messages;
drop policy if exists memories_owner on memories;
drop policy if exists tasks_owner on tasks;
drop policy if exists devices_owner on devices;
drop policy if exists conversations_select on conversations;
drop policy if exists messages_select on messages;
drop policy if exists memories_select on memories;
drop policy if exists tasks_select on tasks;
drop policy if exists devices_select on devices;

create policy conversations_select on conversations for select
  using (user_id = auth.uid()::text);
create policy messages_select on messages for select
  using (exists (select 1 from conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()::text));
create policy memories_select on memories for select
  using (user_id = auth.uid()::text);
create policy tasks_select on tasks for select
  using (user_id = auth.uid()::text);
create policy devices_select on devices for select
  using (user_id = auth.uid()::text);
-- usage_records e audit_events já são somente select (migration inicial); integration_tokens segue sem policy.

-- Defesa em profundidade: sem privilégios de escrita para os papéis do cliente (se existirem, ex.: Supabase).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke insert, update, delete, truncate on conversations, messages, memories, tasks, usage_records, audit_events, devices, integration_tokens from %I', r);
    end if;
  end loop;
end $$;
