-- Onboarding: criar a primeira paróquia e convidar pessoas por e-mail.

-- O gatilho de papéis passa a avaliar quem CHAMA (security invoker): ações feitas
-- por funções do próprio banco (security definer, como aceitar convite) são confiáveis.
alter function private.guard_membership() security invoker;
create or replace function private.guard_membership() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') or auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and new.role is distinct from old.role then
    raise exception 'não é permitido alterar o próprio papel';
  end if;
  if new.role = 'parish_admin' and not private.has_role(new.parish_id, array['parish_admin']::public.app_role[]) then
    raise exception 'apenas administradores paroquiais concedem esse papel';
  end if;
  return new;
end $$;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.app_role not null default 'volunteer',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create unique index on public.invitations (parish_id, lower(email)) where accepted_at is null;
alter table public.invitations enable row level security;
revoke all on public.invitations from anon;
grant select, insert, delete on public.invitations to authenticated;

create policy sel on public.invitations for select to authenticated using (private.is_staff(parish_id));
create policy ins on public.invitations for insert to authenticated with check (
  invited_by = auth.uid() and accepted_at is null and private.is_staff(parish_id)
  and (role <> 'parish_admin' or private.has_role(parish_id, array['parish_admin']::public.app_role[])));
create policy del on public.invitations for delete to authenticated using (private.is_staff(parish_id));

create trigger audit after insert or update or delete on public.invitations
  for each row execute function private.audit();

-- Cria uma paróquia e torna quem chamou administrador dela (máx. 3 por pessoa).
create function public.create_parish(p_name text, p_slug text, p_city text default null, p_diocese text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'faça login primeiro'; end if;
  if (select count(*) from public.memberships where user_id = uid and role = 'parish_admin') >= 3 then
    raise exception 'limite de paróquias atingido';
  end if;
  insert into public.parishes (name, slug, city, diocese) values (trim(p_name), lower(trim(p_slug)), p_city, p_diocese)
    returning id into pid;
  insert into public.memberships (parish_id, user_id, role) values (pid, uid, 'parish_admin');
  return lower(trim(p_slug));
end $$;

-- Aceita um convite: o e-mail de quem está logado precisa ser o do convite.
create function public.accept_invitation(p_token uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); inv public.invitations; s text;
begin
  if uid is null then raise exception 'faça login primeiro'; end if;
  select * into inv from public.invitations where token = p_token for update;
  if not found or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'convite inválido ou expirado';
  end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt()->>'email', '')) then
    raise exception 'este convite foi enviado para outro e-mail';
  end if;
  insert into public.memberships (parish_id, user_id, role) values (inv.parish_id, uid, inv.role)
    on conflict (parish_id, user_id) do update set active = true;
  update public.invitations set accepted_at = now(), accepted_by = uid where id = inv.id;
  select slug into s from public.parishes where id = inv.parish_id;
  return s;
end $$;

revoke execute on function public.create_parish(text, text, text, text), public.accept_invitation(uuid) from anon, public;
grant execute on function public.create_parish(text, text, text, text), public.accept_invitation(uuid) to authenticated;
