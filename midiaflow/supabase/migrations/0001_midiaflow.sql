-- MídiaFlow — esquema inicial (Supabase / PostgreSQL)
-- Separação por paróquia + controle de acesso por função com Row Level Security.

create extension if not exists "pgcrypto";

-- Tipos ---------------------------------------------------------------------
create type access_level as enum ('admin', 'coordenador', 'integrante');
create type member_status as enum ('ativo', 'inativo', 'convidado');
create type slot_status as enum ('pendente', 'confirmado', 'recusado', 'substituicao');
create type period as enum ('manha', 'tarde', 'noite');

-- Paróquias e perfis ----------------------------------------------------------
create table parishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  city text,
  pascom_name text,
  created_at timestamptz not null default now()
);

-- Um perfil por usuário autenticado (auth.users), vinculado a uma paróquia.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  access access_level not null default 'integrante',
  created_at timestamptz not null default now()
);

-- Integrantes da PASCOM (podem existir antes de terem login: convites).
create table members (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 3 and 120),
  photo_url text check (photo_url is null or photo_url like 'https://%'),
  status member_status not null default 'ativo',
  joined_at date not null default current_date
);

-- Dados pessoais em tabela separada: só coordenação e o próprio integrante leem.
create table member_contacts (
  member_id uuid primary key references members (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  color text not null default '#55B8FF',
  icon text not null default 'Sparkles',
  description text,
  unique (parish_id, name)
);

-- Pares de funções que a mesma pessoa pode acumular na mesma celebração.
create table role_compatibility (
  role_a uuid not null references roles (id) on delete cascade,
  role_b uuid not null references roles (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  primary key (role_a, role_b),
  check (role_a < role_b)
);

create table member_roles (
  member_id uuid not null references members (id) on delete cascade,
  role_id uuid not null references roles (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  primary key (member_id, role_id)
);

create table availability (
  member_id uuid primary key references members (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  weekdays smallint[] not null default '{}',
  periods period[] not null default '{}',
  unavailable_dates date[] not null default '{}'
);

-- Eventos e escalas -------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  title text not null check (char_length(title) >= 3),
  type text not null,
  date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  location text not null,
  description text,
  required_role_ids uuid[] not null default '{}',
  checklist jsonb not null default '[]'
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  event_id uuid references events (id) on delete set null,
  title text not null check (char_length(title) >= 3),
  event_type text not null,
  date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  location text not null,
  coordinator_id uuid references members (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Designação = uma vaga (função) dentro de uma escala, com a confirmação.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  schedule_id uuid not null references schedules (id) on delete cascade,
  role_id uuid not null references roles (id),
  member_id uuid references members (id) on delete set null,
  status slot_status not null default 'pendente',
  note text check (note is null or char_length(note) <= 140),
  responded_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references parishes (id) on delete cascade,
  recipient_id uuid references members (id) on delete cascade, -- null = toda a coordenação
  kind text not null,
  title text not null,
  body text not null,
  schedule_id uuid references schedules (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  parish_id uuid not null references parishes (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text not null,
  at timestamptz not null default now()
);

create index on schedules (parish_id, date);
create index on assignments (schedule_id);
create index on assignments (member_id);
create index on events (parish_id, date);
create index on notifications (parish_id, recipient_id, read);

-- Funções auxiliares (security definer evita recursão nas políticas) ----------------
create or replace function my_parish() returns uuid
language sql stable security definer set search_path = public as
$$ select parish_id from profiles where id = auth.uid() $$;

create or replace function my_access() returns access_level
language sql stable security definer set search_path = public as
$$ select access from profiles where id = auth.uid() $$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(my_access() in ('admin', 'coordenador'), false) $$;

create or replace function my_member_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from members where user_id = auth.uid() $$;

-- RLS ------------------------------------------------------------------------
alter table parishes enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table member_contacts enable row level security;
alter table roles enable row level security;
alter table role_compatibility enable row level security;
alter table member_roles enable row level security;
alter table availability enable row level security;
alter table events enable row level security;
alter table schedules enable row level security;
alter table assignments enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- Paróquia: todos da paróquia leem; só admin altera.
create policy parish_read on parishes for select using (id = my_parish());
create policy parish_admin on parishes for update using (id = my_parish() and my_access() = 'admin');

-- Perfis: cada um lê o seu; admin gerencia os da paróquia.
create policy profile_self on profiles for select using (id = auth.uid() or (parish_id = my_parish() and my_access() = 'admin'));
create policy profile_admin on profiles for all using (parish_id = my_parish() and my_access() = 'admin')
  with check (parish_id = my_parish() and my_access() = 'admin');

-- Tabelas da paróquia: leitura para todos da paróquia, escrita para coordenação.
do $$
declare t text;
begin
  foreach t in array array['members', 'roles', 'role_compatibility', 'member_roles', 'events', 'schedules', 'assignments'] loop
    execute format('create policy %1$s_read on %1$s for select using (parish_id = my_parish())', t);
    execute format('create policy %1$s_staff on %1$s for all using (parish_id = my_parish() and is_staff()) with check (parish_id = my_parish() and is_staff())', t);
  end loop;
end $$;

-- Contatos: coordenação ou o próprio integrante.
create policy contacts_read on member_contacts for select
  using (parish_id = my_parish() and (is_staff() or member_id = my_member_id()));
create policy contacts_write on member_contacts for all
  using (parish_id = my_parish() and (is_staff() or member_id = my_member_id()))
  with check (parish_id = my_parish() and (is_staff() or member_id = my_member_id()));

-- Disponibilidade: todos da paróquia leem (para montar escalas); o próprio ou a coordenação editam.
create policy availability_read on availability for select using (parish_id = my_parish());
create policy availability_write on availability for all
  using (parish_id = my_parish() and (is_staff() or member_id = my_member_id()))
  with check (parish_id = my_parish() and (is_staff() or member_id = my_member_id()));

-- Confirmação de presença: o integrante só pode mudar status/nota da PRÓPRIA vaga,
-- via função (não pode trocar a pessoa nem a função). Não há substituição automática.
create or replace function respond_assignment(p_id uuid, p_status slot_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status = 'pendente' then raise exception 'status inválido'; end if;
  update assignments
     set status = p_status, note = left(p_note, 140), responded_at = now()
   where id = p_id and member_id = my_member_id() and parish_id = my_parish();
  if not found then raise exception 'vaga não encontrada'; end if;
  insert into notifications (parish_id, kind, title, body, schedule_id)
  select a.parish_id,
         case p_status when 'confirmado' then 'confirmacao' when 'recusado' then 'recusa' else 'substituicao' end,
         case p_status when 'confirmado' then 'Presença confirmada' else 'Vaga precisa de substituição' end,
         m.name || ' respondeu: ' || p_status, a.schedule_id
    from assignments a join members m on m.id = a.member_id where a.id = p_id;
end $$;
revoke all on function respond_assignment from public;
grant execute on function respond_assignment to authenticated;

-- Notificações: destinatário lê as suas; coordenação lê as gerais.
create policy notif_read on notifications for select
  using (parish_id = my_parish() and (recipient_id = my_member_id() or (recipient_id is null and is_staff())));
create policy notif_mark on notifications for update
  using (parish_id = my_parish() and (recipient_id = my_member_id() or (recipient_id is null and is_staff())));

-- Auditoria: somente leitura para a coordenação; gravação via triggers.
create policy audit_read on audit_log for select using (parish_id = my_parish() and is_staff());

create or replace function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec record;
begin
  rec := coalesce(new, old);
  insert into audit_log (parish_id, actor_id, action, entity, entity_id, summary)
  values (rec.parish_id, auth.uid(), lower(tg_op), tg_table_name, rec.id, tg_op || ' em ' || tg_table_name);
  return rec;
end $$;

create trigger audit_schedules after insert or update or delete on schedules for each row execute function log_change();
create trigger audit_assignments after insert or update or delete on assignments for each row execute function log_change();
create trigger audit_events after insert or update or delete on events for each row execute function log_change();
create trigger audit_members after insert or update or delete on members for each row execute function log_change();
