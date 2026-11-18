-- Paróquia360 — schema inicial, multi-tenant por parish_id, com RLS em todas as tabelas.
-- Convenção: tabelas de domínio têm parish_id; relações filhas usam FK composta (parish_id, x_id)
-- para que nenhum registro aponte para dados de outra paróquia.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

-- ===================== Tipos =====================
create type public.app_role as enum ('parish_admin','priest','coordinator','pastoral_agent','volunteer');
create type public.event_type as enum ('mass','meeting','formation','retreat','feast','procession','special');
create type public.assignment_status as enum ('pending','confirmed','declined','swap_requested');
create type public.help_status as enum ('open','filled','cancelled');
create type public.offer_status as enum ('offered','accepted','declined','withdrawn');
create type public.audience as enum ('all','coordinators','pastoral');

-- ===================== Tabelas =====================
create table public.parishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 3 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  diocese text,
  city text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{8,20}$'),
  birth_date date,
  guardian_name text,
  guardian_consent_at timestamptz,      -- obrigatório para menores participarem de escalas
  privacy_consent_at timestamptz,       -- aceite da política de privacidade (LGPD)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'volunteer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parish_id, user_id)
);
create index on public.memberships (user_id);

create table public.pastorals (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  name text not null check (length(name) between 2 and 80),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parish_id, id),
  unique (parish_id, name)
);

create table public.pastoral_members (
  parish_id uuid not null,
  pastoral_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_coordinator boolean not null default false,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (pastoral_id, user_id),
  foreign key (parish_id, pastoral_id) references public.pastorals(parish_id, id) on delete cascade,
  foreign key (parish_id, user_id) references public.memberships(parish_id, user_id) on delete cascade
);
create index on public.pastoral_members (user_id);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  unique (parish_id, id),
  unique (parish_id, name)
);

create table public.volunteer_skills (
  parish_id uuid not null,
  user_id uuid not null,
  skill_id uuid not null,
  primary key (user_id, skill_id),
  foreign key (parish_id, skill_id) references public.skills(parish_id, id) on delete cascade,
  foreign key (parish_id, user_id) references public.memberships(parish_id, user_id) on delete cascade
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null,
  user_id uuid not null,
  weekday smallint check (weekday between 0 and 6),   -- recorrente (0 = domingo)
  on_date date,                                       -- ou exceção em data específica
  start_time time not null,
  end_time time not null,
  available boolean not null default true,            -- false = indisponível nessa data
  check (end_time > start_time),
  check ((weekday is null) <> (on_date is null)),
  foreign key (parish_id, user_id) references public.memberships(parish_id, user_id) on delete cascade
);
create index on public.availability (parish_id, user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  pastoral_id uuid,
  type public.event_type not null,
  title text not null check (length(title) between 2 and 120),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  unique (parish_id, id),
  foreign key (parish_id, pastoral_id) references public.pastorals(parish_id, id) on delete set null (pastoral_id)
);
create index on public.events (parish_id, starts_at);

create table public.roster_roles (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  pastoral_id uuid not null,
  name text not null check (length(name) between 2 and 60),
  skill_id uuid,
  unique (parish_id, id),
  unique (parish_id, name),
  foreign key (parish_id, pastoral_id) references public.pastorals(parish_id, id) on delete cascade,
  foreign key (parish_id, skill_id) references public.skills(parish_id, id) on delete set null (skill_id)
);

create table public.roster_slots (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null,
  event_id uuid not null,
  roster_role_id uuid not null,
  quantity smallint not null default 1 check (quantity between 1 and 50),
  unique (parish_id, id),
  unique (event_id, roster_role_id),
  foreign key (parish_id, event_id) references public.events(parish_id, id) on delete cascade,
  foreign key (parish_id, roster_role_id) references public.roster_roles(parish_id, id) on delete cascade
);

create table public.roster_assignments (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null,
  slot_id uuid not null,
  user_id uuid not null,
  status public.assignment_status not null default 'pending',
  responded_at timestamptz,
  swap_note text check (length(swap_note) <= 280),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, user_id),
  foreign key (parish_id, slot_id) references public.roster_slots(parish_id, id) on delete cascade,
  foreign key (parish_id, user_id) references public.memberships(parish_id, user_id) on delete cascade
);
create index on public.roster_assignments (user_id);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null,
  pastoral_id uuid not null,
  event_id uuid,
  skill_id uuid,
  title text not null check (length(title) between 2 and 120),
  description text,
  needed smallint not null default 1 check (needed between 1 and 50),
  status public.help_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parish_id, id),
  foreign key (parish_id, pastoral_id) references public.pastorals(parish_id, id) on delete cascade,
  foreign key (parish_id, event_id) references public.events(parish_id, id) on delete set null (event_id),
  foreign key (parish_id, skill_id) references public.skills(parish_id, id) on delete set null (skill_id)
);

create table public.help_offers (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null,
  help_request_id uuid not null,
  user_id uuid not null,
  status public.offer_status not null default 'offered',
  created_at timestamptz not null default now(),
  unique (help_request_id, user_id),
  foreign key (parish_id, help_request_id) references public.help_requests(parish_id, id) on delete cascade,
  foreign key (parish_id, user_id) references public.memberships(parish_id, user_id) on delete cascade
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  audience public.audience not null default 'all',
  pastoral_id uuid,
  title text not null check (length(title) between 2 and 140),
  body text not null,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((audience = 'pastoral') = (pastoral_id is not null)),
  foreign key (parish_id, pastoral_id) references public.pastorals(parish_id, id) on delete cascade
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  parish_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  at timestamptz not null default now()
);
create index on public.audit_log (parish_id, at desc);

-- ===================== Funções de acesso (schema privado) =====================
create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

create function private.has_role(p uuid, roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.parish_id = p and m.user_id = auth.uid() and m.active and m.role = any(roles))
$$;

create function private.is_member(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
                 where m.parish_id = p and m.user_id = auth.uid() and m.active)
$$;

create function private.is_staff(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role(p, array['parish_admin','priest']::public.app_role[])
$$;

create function private.coordinates(pastoral uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pastoral_members pm
    join public.memberships m on m.parish_id = pm.parish_id and m.user_id = pm.user_id and m.active
    where pm.pastoral_id = pastoral and pm.user_id = auth.uid() and pm.is_coordinator and pm.active)
$$;

-- Pode gerenciar algo ligado a uma pastoral: equipe da paróquia ou coordenador dela.
create function private.can_manage_pastoral(p uuid, pastoral uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff(p) or (pastoral is not null and private.coordinates(pastoral))
$$;

create function private.slot_pastoral(slot uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select rr.pastoral_id from public.roster_slots s
  join public.roster_roles rr on rr.id = s.roster_role_id where s.id = slot
$$;

create function private.is_minor(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select birth_date > current_date - interval '18 years'
                   from public.profiles where user_id = u), false)
$$;

-- Quem vê o perfil completo de outra pessoa: equipe de uma paróquia em comum;
-- coordenador de pastoral em comum (adultos: qualquer coordenador da paróquia).
create function private.can_view_profile(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select target = auth.uid()
    or exists (select 1 from public.memberships mt
               where mt.user_id = target and mt.active and private.is_staff(mt.parish_id))
    or exists (select 1 from public.pastoral_members pt
               where pt.user_id = target and pt.active and private.coordinates(pt.pastoral_id))
    or (not private.is_minor(target) and exists (
          select 1 from public.memberships mt
          where mt.user_id = target and mt.active
            and private.has_role(mt.parish_id, array['coordinator']::public.app_role[])))
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Diretório mínimo: nomes de quem é da mesma paróquia (para exibir escalas).
-- Menores aparecem só com o primeiro nome para quem não pode ver o perfil.
create function public.parish_directory(p uuid)
returns table (user_id uuid, display_name text, role public.app_role)
language sql stable security definer set search_path = '' as $$
  select m.user_id,
         case when private.is_minor(m.user_id) and not private.can_view_profile(m.user_id)
              then split_part(pr.full_name, ' ', 1) else pr.full_name end,
         m.role
  from public.memberships m
  join public.profiles pr on pr.user_id = m.user_id
  where m.parish_id = p and m.active and private.is_member(p)
$$;
revoke all on function public.parish_directory(uuid) from public;
grant execute on function public.parish_directory(uuid) to authenticated;

-- ===================== Triggers =====================
create function private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['parishes','profiles','memberships','pastorals','events',
                           'roster_assignments','help_requests','announcements'] loop
    execute format('create trigger touch before update on public.%I
                    for each row execute function private.touch_updated_at()', t);
  end loop;
end $$;

-- Perfil criado automaticamente para cada usuário do Auth.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Ninguém se promove: só parish_admin altera papéis; ninguém altera o próprio papel.
create function private.guard_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_platform_admin() then return new; end if;
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and new.role is distinct from old.role then
    raise exception 'não é permitido alterar o próprio papel';
  end if;
  if new.role = 'parish_admin' and not private.has_role(new.parish_id, array['parish_admin']::public.app_role[]) then
    raise exception 'apenas administradores paroquiais concedem esse papel';
  end if;
  return new;
end $$;
create trigger guard before insert or update on public.memberships
  for each row execute function private.guard_membership();

-- O voluntário só altera a própria resposta (status/observação), nunca troca a escala.
create function private.guard_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.can_manage_pastoral(new.parish_id, private.slot_pastoral(new.slot_id)) then
    return new;
  end if;
  if new.user_id <> old.user_id or new.slot_id <> old.slot_id or new.parish_id <> old.parish_id
     or new.assigned_by is distinct from old.assigned_by then
    raise exception 'apenas a coordenação altera a escala';
  end if;
  if new.status = 'pending' and old.status <> 'pending' then
    raise exception 'status inválido';
  end if;
  if new.status is distinct from old.status then new.responded_at := now(); end if;
  return new;
end $$;
create trigger guard before update on public.roster_assignments
  for each row execute function private.guard_assignment();

-- Menor de idade só entra em escala com consentimento do responsável registrado.
create function private.require_guardian_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.is_minor(new.user_id) and not exists (
       select 1 from public.profiles where user_id = new.user_id and guardian_consent_at is not null) then
    raise exception 'menor de idade sem consentimento do responsável';
  end if;
  return new;
end $$;
create trigger minor_consent before insert on public.roster_assignments
  for each row execute function private.require_guardian_consent();

-- Auditoria de ações administrativas.
create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (parish_id, actor_id, action, entity, entity_id, diff)
  values ((r->>'parish_id')::uuid, auth.uid(), lower(tg_op), tg_table_name, r->>'id',
          case when tg_op = 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', r) else r end);
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['memberships','pastorals','pastoral_members','events',
                           'roster_slots','roster_assignments','announcements'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function private.audit()', t);
  end loop;
end $$;

-- ===================== RLS =====================
do $$ declare t text; begin
  foreach t in array array['parishes','profiles','platform_admins','memberships','pastorals',
    'pastoral_members','skills','volunteer_skills','availability','events','roster_roles',
    'roster_slots','roster_assignments','help_requests','help_offers','announcements','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- parishes
create policy sel on public.parishes for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());
create policy upd on public.parishes for update to authenticated
  using (private.has_role(id, array['parish_admin']::public.app_role[]))
  with check (private.has_role(id, array['parish_admin']::public.app_role[]));
create policy ins on public.parishes for insert to authenticated with check (private.is_platform_admin());

-- profiles
create policy sel on public.profiles for select to authenticated using (private.can_view_profile(user_id));
create policy upd on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- platform_admins: apenas leitura do próprio registro
create policy sel on public.platform_admins for select to authenticated using (user_id = auth.uid());

-- memberships
create policy sel on public.memberships for select to authenticated
  using (user_id = auth.uid() or private.is_staff(parish_id)
         or private.has_role(parish_id, array['coordinator']::public.app_role[]));
create policy ins on public.memberships for insert to authenticated
  with check (private.has_role(parish_id, array['parish_admin']::public.app_role[]) or private.is_platform_admin());
create policy upd on public.memberships for update to authenticated
  using (private.has_role(parish_id, array['parish_admin']::public.app_role[]))
  with check (private.has_role(parish_id, array['parish_admin']::public.app_role[]));
create policy del on public.memberships for delete to authenticated
  using (private.has_role(parish_id, array['parish_admin']::public.app_role[]) and user_id <> auth.uid());

-- pastorals
create policy sel on public.pastorals for select to authenticated using (private.is_member(parish_id));
create policy ins on public.pastorals for insert to authenticated with check (private.is_staff(parish_id));
create policy upd on public.pastorals for update to authenticated
  using (private.can_manage_pastoral(parish_id, id)) with check (private.can_manage_pastoral(parish_id, id));
create policy del on public.pastorals for delete to authenticated using (private.is_staff(parish_id));

-- pastoral_members
create policy sel on public.pastoral_members for select to authenticated using (private.is_member(parish_id));
create policy ins on public.pastoral_members for insert to authenticated
  with check (private.is_staff(parish_id) or (private.coordinates(pastoral_id) and not is_coordinator));
create policy upd on public.pastoral_members for update to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id))
  with check (private.is_staff(parish_id) or (private.coordinates(pastoral_id) and (not is_coordinator or user_id = auth.uid())));
create policy del on public.pastoral_members for delete to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id) or user_id = auth.uid());

-- skills
create policy sel on public.skills for select to authenticated using (private.is_member(parish_id));
create policy wr on public.skills for all to authenticated
  using (private.is_staff(parish_id)) with check (private.is_staff(parish_id));

-- volunteer_skills / availability: o próprio voluntário, equipe e coordenadores
create policy sel on public.volunteer_skills for select to authenticated
  using (user_id = auth.uid() or private.is_staff(parish_id)
         or private.has_role(parish_id, array['coordinator']::public.app_role[]));
create policy wr on public.volunteer_skills for all to authenticated
  using (user_id = auth.uid() or private.is_staff(parish_id))
  with check ((user_id = auth.uid() and private.is_member(parish_id)) or private.is_staff(parish_id));

create policy sel on public.availability for select to authenticated
  using (user_id = auth.uid() or private.is_staff(parish_id)
         or private.has_role(parish_id, array['coordinator']::public.app_role[]));
create policy wr on public.availability for all to authenticated
  using (user_id = auth.uid() or private.is_staff(parish_id))
  with check ((user_id = auth.uid() and private.is_member(parish_id)) or private.is_staff(parish_id));

-- events
create policy sel on public.events for select to authenticated using (private.is_member(parish_id));
create policy ins on public.events for insert to authenticated
  with check (private.can_manage_pastoral(parish_id, pastoral_id) and created_by = auth.uid());
create policy upd on public.events for update to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id))
  with check (private.can_manage_pastoral(parish_id, pastoral_id));
create policy del on public.events for delete to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id));

-- roster_roles
create policy sel on public.roster_roles for select to authenticated using (private.is_member(parish_id));
create policy wr on public.roster_roles for all to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id))
  with check (private.can_manage_pastoral(parish_id, pastoral_id));

-- roster_slots
create policy sel on public.roster_slots for select to authenticated using (private.is_member(parish_id));
create policy wr on public.roster_slots for all to authenticated
  using (private.can_manage_pastoral(parish_id, private.slot_pastoral(id)))
  with check (private.can_manage_pastoral(parish_id,
    (select pastoral_id from public.roster_roles where id = roster_role_id)));

-- roster_assignments
create policy sel on public.roster_assignments for select to authenticated using (private.is_member(parish_id));
create policy ins on public.roster_assignments for insert to authenticated
  with check (private.can_manage_pastoral(parish_id, private.slot_pastoral(slot_id)));
create policy upd on public.roster_assignments for update to authenticated
  using (user_id = auth.uid() or private.can_manage_pastoral(parish_id, private.slot_pastoral(slot_id)))
  with check (user_id = auth.uid() or private.can_manage_pastoral(parish_id, private.slot_pastoral(slot_id)));
create policy del on public.roster_assignments for delete to authenticated
  using (private.can_manage_pastoral(parish_id, private.slot_pastoral(slot_id)));

-- help_requests ("Preciso de ajuda")
create policy sel on public.help_requests for select to authenticated using (private.is_member(parish_id));
create policy ins on public.help_requests for insert to authenticated
  with check (private.can_manage_pastoral(parish_id, pastoral_id) and created_by = auth.uid());
create policy upd on public.help_requests for update to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id))
  with check (private.can_manage_pastoral(parish_id, pastoral_id));
create policy del on public.help_requests for delete to authenticated
  using (private.can_manage_pastoral(parish_id, pastoral_id));

-- help_offers
create policy sel on public.help_offers for select to authenticated
  using (user_id = auth.uid() or private.can_manage_pastoral(parish_id,
         (select pastoral_id from public.help_requests where id = help_request_id)));
create policy ins on public.help_offers for insert to authenticated
  with check (user_id = auth.uid() and status = 'offered' and private.is_member(parish_id)
              and exists (select 1 from public.help_requests r where r.id = help_request_id and r.status = 'open'));
create policy upd on public.help_offers for update to authenticated
  using (user_id = auth.uid() or private.can_manage_pastoral(parish_id,
         (select pastoral_id from public.help_requests where id = help_request_id)))
  with check ((user_id = auth.uid() and status = 'withdrawn') or private.can_manage_pastoral(parish_id,
         (select pastoral_id from public.help_requests where id = help_request_id)));

-- announcements
create policy sel on public.announcements for select to authenticated using (
  private.is_staff(parish_id)
  or (private.is_member(parish_id) and audience = 'all')
  or (audience = 'coordinators' and private.has_role(parish_id, array['coordinator']::public.app_role[]))
  or (audience = 'pastoral' and exists (select 1 from public.pastoral_members pm
        where pm.pastoral_id = announcements.pastoral_id and pm.user_id = auth.uid() and pm.active)));
create policy ins on public.announcements for insert to authenticated with check (
  created_by = auth.uid() and (private.is_staff(parish_id)
  or (audience = 'pastoral' and private.coordinates(pastoral_id))));
create policy upd on public.announcements for update to authenticated
  using (private.is_staff(parish_id) or (audience = 'pastoral' and private.coordinates(pastoral_id)))
  with check (private.is_staff(parish_id) or (audience = 'pastoral' and private.coordinates(pastoral_id)));
create policy del on public.announcements for delete to authenticated
  using (private.is_staff(parish_id) or (audience = 'pastoral' and private.coordinates(pastoral_id)));

-- audit_log: só leitura, só equipe da paróquia
create policy sel on public.audit_log for select to authenticated using (private.is_staff(parish_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log, public.platform_admins from authenticated;
