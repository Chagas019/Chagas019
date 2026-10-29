-- MídiaFlow — banco de dados (Supabase / PostgreSQL)
--
-- Modelo:
--   parishes          paróquia (+ código de convite, legível só pela coordenação)
--   profiles          vínculo usuário (auth.users) ⇄ paróquia ⇄ integrante, com nível de acesso
--   parish_data       estado da paróquia (escalas, eventos, equipe, funções, avisos…) em JSON versionado
--   member_contacts   e-mail/telefone dos integrantes, fora do JSON: só a coordenação e o próprio leem
--   training_progress progresso da Formação, por usuário
--
-- Toda escrita sensível passa por funções SECURITY DEFINER que validam quem pede:
--   integrante  → responde só às próprias vagas e edita só a própria disponibilidade
--   coordenador → salva escalas/eventos/equipe, mas não muda nível de acesso nem dados da paróquia
--   admin       → tudo, inclusive níveis de acesso e código de convite
-- Row Level Security isola as paróquias entre si.

create extension if not exists pgcrypto;

do $$ begin
  create type access_level as enum ('admin', 'coordenador', 'integrante');
exception when duplicate_object then null; end $$;

-- Tabelas --------------------------------------------------------------------
create table if not exists parishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  city text not null default '' check (char_length(city) <= 120),
  pascom_name text not null default '' check (char_length(pascom_name) <= 120),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  parish_id uuid not null references parishes (id) on delete cascade,
  member_id text not null,
  access access_level not null default 'integrante',
  full_name text not null check (char_length(full_name) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (parish_id, member_id)
);

create table if not exists parish_data (
  parish_id uuid primary key references parishes (id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists member_contacts (
  parish_id uuid not null references parishes (id) on delete cascade,
  member_id text not null,
  email text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null default '' check (char_length(phone) <= 30),
  primary key (parish_id, member_id)
);

create table if not exists training_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  done text[] not null default '{}' check (cardinality(done) <= 200),
  quiz jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_parish_idx on profiles (parish_id);

-- Funções auxiliares ------------------------------------------------------------
create or replace function my_parish() returns uuid
language sql stable security definer set search_path = public as
$$ select parish_id from profiles where id = auth.uid() $$;

create or replace function my_access() returns access_level
language sql stable security definer set search_path = public as
$$ select access from profiles where id = auth.uid() $$;

create or replace function my_member_id() returns text
language sql stable security definer set search_path = public as
$$ select member_id from profiles where id = auth.uid() $$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select access in ('admin', 'coordenador') from profiles where id = auth.uid()), false) $$;

-- Row Level Security ---------------------------------------------------------------
alter table parishes enable row level security;
alter table profiles enable row level security;
alter table parish_data enable row level security;
alter table member_contacts enable row level security;
alter table training_progress enable row level security;

drop policy if exists parish_read on parishes;
create policy parish_read on parishes for select to authenticated using (id = my_parish());

-- O código de convite não fica visível para integrantes: só via get_invite_code().
revoke select on parishes from authenticated, anon;
grant select (id, name, city, pascom_name, created_at) on parishes to authenticated;

drop policy if exists profile_read on profiles;
create policy profile_read on profiles for select to authenticated
  using (id = auth.uid() or (parish_id = my_parish() and is_staff()));

drop policy if exists data_read on parish_data;
create policy data_read on parish_data for select to authenticated using (parish_id = my_parish());

drop policy if exists contacts_rw on member_contacts;
create policy contacts_rw on member_contacts for all to authenticated
  using (parish_id = my_parish() and (is_staff() or member_id = my_member_id()))
  with check (parish_id = my_parish() and (is_staff() or member_id = my_member_id()));

drop policy if exists progress_rw on training_progress;
create policy progress_rw on training_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Escrita direta bloqueada nas tabelas controladas por funções.
revoke insert, update, delete on parishes, profiles, parish_data from authenticated, anon;
grant select on profiles, parish_data to authenticated;
grant select, insert, update, delete on member_contacts, training_progress to authenticated;

-- Helpers JSON -----------------------------------------------------------------
-- Integrante novo no formato que o app usa (contatos ficam em member_contacts).
create or replace function _new_member(p_id text, p_name text, p_access access_level)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id', p_id, 'name', p_name, 'roleIds', '[]'::jsonb,
    'availability', jsonb_build_object('weekdays', '[0,6]'::jsonb, 'periods', '["manha","noite"]'::jsonb, 'unavailableDates', '[]'::jsonb),
    'email', '', 'phone', '', 'status', 'ativo', 'access', p_access::text, 'joinedAt', to_char(current_date, 'YYYY-MM-DD'))
$$;

create or replace function _push(arr jsonb, item jsonb, max_len int) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(e order by ord), '[]'::jsonb)
  from (select e, ord from jsonb_array_elements(jsonb_build_array(item) || coalesce(arr, '[]'::jsonb)) with ordinality t(e, ord) limit max_len) s
$$;

-- Criar paróquia (quem cria vira administrador) -----------------------------------------
create or replace function create_parish(p_name text, p_city text, p_pascom text, p_full_name text, p_roles jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_parish uuid; v_member text := 'm_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'already_member'; end if;
  if jsonb_typeof(p_roles) <> 'array' or jsonb_array_length(p_roles) > 50 then raise exception 'invalid_roles'; end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'invalid_name'; end if;

  insert into parishes (name, city, pascom_name, created_by)
  values (trim(p_name), trim(coalesce(p_city, '')), trim(coalesce(p_pascom, '')), auth.uid())
  returning id into v_parish;

  insert into profiles (id, parish_id, member_id, access, full_name)
  values (auth.uid(), v_parish, v_member, 'admin', trim(p_full_name));

  insert into member_contacts (parish_id, member_id, email)
  select v_parish, v_member, coalesce(email, '') from auth.users where id = auth.uid();

  insert into parish_data (parish_id, data, updated_by) values (v_parish, jsonb_build_object(
    'parish', jsonb_build_object('name', trim(p_name), 'city', trim(coalesce(p_city, '')), 'pascomName', trim(coalesce(p_pascom, ''))),
    'roles', p_roles,
    'members', jsonb_build_array(_new_member(v_member, trim(p_full_name), 'admin')),
    'schedules', '[]'::jsonb, 'events', '[]'::jsonb, 'notifications', '[]'::jsonb,
    'audit', '[]'::jsonb, 'announcements', '[]'::jsonb
  ), auth.uid());
  return v_parish;
end $$;

-- Entrar numa paróquia com o código de convite --------------------------------------------
create or replace function join_parish(p_code text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_parish uuid; v_email text; v_member text; v_data jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'already_member'; end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'invalid_name'; end if;
  select id into v_parish from parishes where invite_code = upper(trim(p_code));
  if v_parish is null then raise exception 'invalid_code'; end if;
  select coalesce(email, '') into v_email from auth.users where id = auth.uid();

  select data into v_data from parish_data where parish_id = v_parish for update;

  -- Se a coordenação já cadastrou a pessoa com este e-mail, vincula ao cadastro existente.
  select c.member_id into v_member from member_contacts c
   where c.parish_id = v_parish and v_email <> '' and lower(c.email) = lower(v_email)
     and not exists (select 1 from profiles p where p.parish_id = v_parish and p.member_id = c.member_id)
   limit 1;

  if v_member is null then
    v_member := 'm_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_data := jsonb_set(v_data, '{members}', coalesce(v_data -> 'members', '[]'::jsonb) || jsonb_build_array(_new_member(v_member, trim(p_full_name), 'integrante')));
    insert into member_contacts (parish_id, member_id, email) values (v_parish, v_member, v_email);
  else
    -- cadastro existente: garante que continua como integrante e ativo
    v_data := jsonb_set(v_data, '{members}', (
      select jsonb_agg(case when e ->> 'id' = v_member then e || jsonb_build_object('access', 'integrante', 'status', 'ativo') else e end order by ord)
      from jsonb_array_elements(v_data -> 'members') with ordinality t(e, ord)));
  end if;

  v_data := jsonb_set(v_data, '{audit}', _push(v_data -> 'audit', jsonb_build_object(
    'id', 'au_' || substr(md5(random()::text), 1, 10), 'at', now(), 'actor', trim(p_full_name),
    'action', 'criou', 'entity', 'integrante', 'entityId', v_member, 'summary', trim(p_full_name) || ' entrou na equipe pelo convite.'), 300));

  insert into profiles (id, parish_id, member_id, access, full_name) values (auth.uid(), v_parish, v_member, 'integrante', trim(p_full_name));
  update parish_data set data = v_data, version = version + 1, updated_at = now(), updated_by = auth.uid() where parish_id = v_parish;
  return v_parish;
end $$;

-- Salvar o estado da paróquia (coordenação) ---------------------------------------------------
create or replace function save_parish_data(p_data jsonb, p_version bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_parish uuid := my_parish(); v_access access_level := my_access();
  v_old jsonb; v_ver bigint; v_members jsonb; v_new bigint;
begin
  if v_parish is null then raise exception 'not_member'; end if;
  if v_access not in ('admin', 'coordenador') then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data -> 'members') <> 'array'
     or jsonb_typeof(p_data -> 'schedules') <> 'array' or jsonb_typeof(p_data -> 'roles') <> 'array' then
    raise exception 'invalid_data';
  end if;
  if pg_column_size(p_data) > 4 * 1024 * 1024 then raise exception 'too_large'; end if;

  select data, version into v_old, v_ver from parish_data where parish_id = v_parish for update;
  if v_ver <> p_version then raise exception 'version_conflict'; end if;

  -- Contatos nunca ficam no JSON. Nível de acesso: coordenador não altera; ninguém se apaga.
  select jsonb_agg(
           (m - 'email' - 'phone') || jsonb_build_object('email', '', 'phone', '',
             'access', case
               when v_access = 'admin' and (m ->> 'access') in ('admin', 'coordenador', 'integrante') then m ->> 'access'
               else coalesce((select o ->> 'access' from jsonb_array_elements(v_old -> 'members') o where o ->> 'id' = m ->> 'id'), 'integrante')
             end)
           order by ord)
    into v_members
    from jsonb_array_elements(p_data -> 'members') with ordinality t(m, ord);

  if exists (select 1 from profiles p where p.parish_id = v_parish
             and not exists (select 1 from jsonb_array_elements(v_members) m where m ->> 'id' = p.member_id)) then
    raise exception 'member_with_account_removed';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_members) m
                 join profiles p on p.parish_id = v_parish and p.member_id = m ->> 'id'
                 where m ->> 'access' = 'admin') then
    raise exception 'last_admin';
  end if;

  p_data := jsonb_set(p_data, '{members}', coalesce(v_members, '[]'::jsonb));
  if v_access <> 'admin' then p_data := jsonb_set(p_data, '{parish}', v_old -> 'parish'); end if;

  update parish_data set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where parish_id = v_parish returning version into v_new;

  if v_access = 'admin' then
    update parishes set name = coalesce(nullif(trim(p_data #>> '{parish,name}'), ''), name),
                        city = coalesce(p_data #>> '{parish,city}', city),
                        pascom_name = coalesce(p_data #>> '{parish,pascomName}', pascom_name)
     where id = v_parish;
    update profiles p set access = (m ->> 'access')::access_level
      from jsonb_array_elements(v_members) m
     where p.parish_id = v_parish and p.member_id = m ->> 'id' and p.access::text <> m ->> 'access';
  end if;
  return v_new;
end $$;

-- Confirmação de presença (qualquer integrante, só na própria vaga) -------------------------------
create or replace function respond_assignment(p_schedule_id text, p_slot_id text, p_status text, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_parish uuid := my_parish(); v_member text := my_member_id(); v_data jsonb;
  si int; sj int; v_title text; v_name text; v_new bigint; v_note text := left(nullif(trim(coalesce(p_note, '')), ''), 140);
begin
  if v_parish is null then raise exception 'not_member'; end if;
  if p_status not in ('confirmado', 'recusado', 'substituicao') then raise exception 'invalid_status'; end if;
  select data into v_data from parish_data where parish_id = v_parish for update;

  select (i - 1)::int into si from jsonb_array_elements(v_data -> 'schedules') with ordinality t(e, i) where e ->> 'id' = p_schedule_id;
  if si is null then raise exception 'not_found'; end if;
  select (j - 1)::int into sj from jsonb_array_elements(v_data -> 'schedules' -> si -> 'slots') with ordinality t(e, j)
   where e ->> 'id' = p_slot_id and e ->> 'memberId' = v_member;
  if sj is null then raise exception 'not_your_slot'; end if;

  v_data := jsonb_set(v_data, array['schedules', si::text, 'slots', sj::text],
    (v_data -> 'schedules' -> si -> 'slots' -> sj) || jsonb_build_object('status', p_status, 'note', v_note, 'respondedAt', now()));
  v_title := v_data -> 'schedules' -> si ->> 'title';
  select full_name into v_name from profiles where id = auth.uid();

  v_data := jsonb_set(v_data, '{notifications}', _push(v_data -> 'notifications', jsonb_build_object(
    'id', 'n_' || substr(md5(random()::text), 1, 10), 'createdAt', now(), 'read', false, 'scheduleId', p_schedule_id,
    'kind', case p_status when 'confirmado' then 'confirmacao' when 'recusado' then 'recusa' else 'substituicao' end,
    'title', case p_status when 'confirmado' then 'Presença confirmada' else 'Vaga precisa de substituição' end,
    'body', v_name || case p_status when 'confirmado' then ' confirmou presença' when 'recusado' then ' não poderá participar' else ' pediu substituição' end
            || ' — ' || v_title || coalesce('. “' || v_note || '”', '')), 200));
  v_data := jsonb_set(v_data, '{audit}', _push(v_data -> 'audit', jsonb_build_object(
    'id', 'au_' || substr(md5(random()::text), 1, 10), 'at', now(), 'actor', v_name, 'action', 'respondeu',
    'entity', 'escala', 'entityId', p_schedule_id, 'summary', v_name || ' respondeu “' || p_status || '” em “' || v_title || '”.'), 300));

  update parish_data set data = v_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where parish_id = v_parish returning version into v_new;
  return v_new;
end $$;

-- Disponibilidade do próprio integrante -------------------------------------------------------
create or replace function update_my_availability(p_availability jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_parish uuid := my_parish(); v_member text := my_member_id(); v_data jsonb; v_new bigint;
begin
  if v_parish is null then raise exception 'not_member'; end if;
  if jsonb_typeof(p_availability -> 'weekdays') <> 'array' or jsonb_typeof(p_availability -> 'periods') <> 'array'
     or jsonb_typeof(p_availability -> 'unavailableDates') <> 'array' then raise exception 'invalid_data'; end if;
  select data into v_data from parish_data where parish_id = v_parish for update;
  v_data := jsonb_set(v_data, '{members}', (
    select jsonb_agg(case when e ->> 'id' = v_member then jsonb_set(e, '{availability}', jsonb_build_object(
      'weekdays', p_availability -> 'weekdays', 'periods', p_availability -> 'periods', 'unavailableDates', p_availability -> 'unavailableDates')) else e end order by ord)
    from jsonb_array_elements(v_data -> 'members') with ordinality t(e, ord)));
  update parish_data set data = v_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where parish_id = v_parish returning version into v_new;
  return v_new;
end $$;

-- Quadro de tarefas: integrante move e marca o checklist só dos cartões em que é responsável --------
create or replace function update_my_card(p_card_id text, p_column_id text, p_checklist jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_parish uuid := my_parish(); v_member text := my_member_id(); v_data jsonb; ci int; v_new bigint;
begin
  if v_parish is null then raise exception 'not_member'; end if;
  if jsonb_typeof(p_checklist) <> 'array' then raise exception 'invalid_data'; end if;
  select data into v_data from parish_data where parish_id = v_parish for update;
  select (i - 1)::int into ci from jsonb_array_elements(v_data #> '{board,cards}') with ordinality t(e, i)
   where e ->> 'id' = p_card_id and (e -> 'assigneeIds') ? v_member;
  if ci is null then raise exception 'not_your_card'; end if;
  if not exists (select 1 from jsonb_array_elements(v_data #> '{board,columns}') c where c ->> 'id' = p_column_id) then
    raise exception 'invalid_data';
  end if;
  -- Só a coluna e o "feito" de cada item: título, responsáveis e o resto ficam como a coordenação deixou.
  v_data := jsonb_set(v_data, array['board', 'cards', ci::text], (v_data #> array['board', 'cards', ci::text]) || jsonb_build_object(
    'columnId', p_column_id,
    'checklist', coalesce((
      select jsonb_agg(k || jsonb_build_object('done', coalesce((select (n ->> 'done')::boolean from jsonb_array_elements(p_checklist) n where n ->> 'id' = k ->> 'id' limit 1), (k ->> 'done')::boolean)) order by ord)
      from jsonb_array_elements(v_data #> array['board', 'cards', ci::text, 'checklist']) with ordinality t(k, ord)), '[]'::jsonb)));
  update parish_data set data = v_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where parish_id = v_parish returning version into v_new;
  return v_new;
end $$;

-- Código de convite ---------------------------------------------------------------------------
create or replace function get_invite_code() returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  return (select invite_code from parishes where id = my_parish());
end $$;

create or replace function regenerate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if my_access() <> 'admin' then raise exception 'forbidden'; end if;
  update parishes set invite_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
   where id = my_parish() returning invite_code into v;
  return v;
end $$;

-- Permissões das funções ------------------------------------------------------------------------
revoke all on function create_parish(text, text, text, text, jsonb), join_parish(text, text),
  save_parish_data(jsonb, bigint), respond_assignment(text, text, text, text), update_my_availability(jsonb),
  update_my_card(text, text, jsonb), get_invite_code(), regenerate_invite_code(), _new_member(text, text, access_level), _push(jsonb, jsonb, int) from public, anon;
grant execute on function create_parish(text, text, text, text, jsonb), join_parish(text, text),
  save_parish_data(jsonb, bigint), respond_assignment(text, text, text, text), update_my_availability(jsonb),
  update_my_card(text, text, jsonb), get_invite_code(), regenerate_invite_code() to authenticated;

-- Tempo real: a coordenação vê as confirmações assim que chegam (respeita o RLS).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table parish_data;
    exception when duplicate_object then null; end;
  end if;
end $$;
