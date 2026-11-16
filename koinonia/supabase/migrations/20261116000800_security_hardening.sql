-- KOINONIA — 0008: endurecimento após revisão de segurança independente.
-- Cada item corresponde a um achado reproduzido em teste (supabase/tests/30_security_regressions.sql).

-- [Baixo] Extensões fora do schema exposto pela API (evita RPC em funções de extensões).
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated;
alter extension pg_trgm set schema extensions;
drop extension if exists pgcrypto; -- gen_random_uuid() é nativo no PostgreSQL 13+

-- [Baixo/Médio] is_blocked_between não pode revelar bloqueios de terceiros.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is not null and (select auth.uid()) not in (a, b) then false
    else exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
    )
  end;
$$;

-- [Alto] Tomada de controle de comunidade por administrador não-owner.
-- Inserção: apenas o próprio usuário entra como membro (convites de admin ficam para uma RPC futura).
drop policy community_members_join on public.community_members;
create policy community_members_join on public.community_members for insert to authenticated
  with check (
    user_id = (select auth.uid()) and role = 'member'
    and exists (select 1 from public.communities c where c.id = community_id and c.status = 'verified')
  );

create or replace function public.community_members_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owners integer;
  v_actor_is_owner boolean;
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('community.join', 30, interval '1 hour');
    return new;
  end if;

  v_actor_is_owner := exists (
    select 1 from public.community_members
    where community_id = old.community_id and user_id = v_uid and role = 'owner'
  );

  -- mexer em um owner (rebaixar/remover) exige ser owner, admin da plataforma ou o próprio owner saindo
  if old.role = 'owner' and v_uid is not null and not v_actor_is_owner and not public.is_admin() then
    raise exception 'only owners can change or remove an owner' using errcode = '42501';
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner') or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into v_owners from public.community_members
    where community_id = old.community_id and role = 'owner' and user_id <> old.user_id;
    if v_owners = 0 and exists (select 1 from public.communities where id = old.community_id) then
      raise exception 'community must keep at least one owner' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.community_id := old.community_id;
    new.user_id := old.user_id;
    new.joined_at := old.joined_at;
    if new.role = 'owner' and old.role <> 'owner' and v_uid is not null and not v_actor_is_owner and not public.is_admin() then
      raise exception 'only owners can grant ownership' using errcode = '42501';
    end if;
    return new;
  end if;
  return old;
end;
$$;
drop trigger community_members_guard on public.community_members;
create trigger community_members_guard
before insert or update or delete on public.community_members
for each row execute function public.community_members_guard();

-- [Médio] Candidaturas: campos de decisão imutáveis fora das transições; admin não se candidata à própria comunidade.
create or replace function public.applications_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_opp record;
  v_is_admin boolean;
begin
  select o.id, o.community_id, o.status into v_opp
  from public.opportunities o where o.id = coalesce(new.opportunity_id, old.opportunity_id);
  v_is_admin := public.is_community_admin(v_opp.community_id);

  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('application.create', 20, interval '1 hour');
    if v_opp.status is distinct from 'open' then
      raise exception 'opportunity is not open' using errcode = '23514';
    end if;
    if v_is_admin then
      raise exception 'community admins cannot apply to their own community' using errcode = '42501';
    end if;
    new.status := 'pending';
    new.decided_by := null;
    new.decided_at := null;
    new.completed_at := null;
    new.created_at := now();
    return new;
  end if;

  new.opportunity_id := old.opportunity_id;
  new.applicant_id := old.applicant_id;
  new.created_at := old.created_at;
  if v_uid is null then
    return new; -- service role
  end if;
  -- campos de decisão só mudam pelas transições abaixo
  new.decided_by := old.decided_by;
  new.decided_at := old.decided_at;
  new.completed_at := old.completed_at;

  if new.status = old.status then
    if new.message is distinct from old.message and (v_uid is distinct from old.applicant_id or old.status <> 'pending') then
      raise exception 'message can only be edited by the applicant while pending' using errcode = '42501';
    end if;
    return new;
  end if;
  if v_uid = old.applicant_id and new.status = 'withdrawn' and old.status in ('pending', 'accepted') then
    return new;
  end if;
  if v_is_admin and old.status = 'pending' and new.status in ('accepted', 'rejected') then
    new.decided_by := v_uid;
    new.decided_at := now();
    return new;
  end if;
  if v_is_admin and old.status = 'accepted' and new.status = 'completed' then
    new.completed_at := now();
    return new;
  end if;
  raise exception 'invalid application status transition % -> %', old.status, new.status using errcode = '42501';
end;
$$;

-- [Médio] Avaliações: quem avalia a comunidade não pode ser administrador dela.
create or replace function public.reviews_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_app record; v_reviewer_is_admin boolean;
begin
  new.reviewer_id := coalesce((select auth.uid()), new.reviewer_id);
  select a.id, a.applicant_id, a.status, o.community_id into v_app
  from public.applications a join public.opportunities o on o.id = a.opportunity_id
  where a.id = new.application_id;
  if v_app.status is distinct from 'completed' then
    raise exception 'reviews are only allowed after a completed collaboration' using errcode = '23514';
  end if;
  v_reviewer_is_admin := exists (
    select 1 from public.community_members
    where community_id = v_app.community_id and user_id = new.reviewer_id and role in ('owner', 'admin'));
  if new.reviewer_id = v_app.applicant_id and not v_reviewer_is_admin then
    if new.reviewee_community_id is distinct from v_app.community_id or new.reviewee_profile_id is not null then
      raise exception 'volunteer can only review the hosting community' using errcode = '42501';
    end if;
  elsif v_reviewer_is_admin and new.reviewer_id <> v_app.applicant_id then
    if new.reviewee_profile_id is distinct from v_app.applicant_id or new.reviewee_community_id is not null then
      raise exception 'community can only review the volunteer' using errcode = '42501';
    end if;
  else
    raise exception 'not a participant of this collaboration' using errcode = '42501';
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- [Médio] Pedidos de recurso: dados do pedido só editáveis pelo solicitante enquanto pendente.
create or replace function public.resource_requests_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_res record;
begin
  select id, community_id, status into v_res from public.resources where id = coalesce(new.resource_id, old.resource_id);
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('resource_request.create', 20, interval '1 hour');
    if v_res.status <> 'available' then
      raise exception 'resource is not available' using errcode = '23514';
    end if;
    if new.requester_community_id is not null and not public.is_community_member(new.requester_community_id) then
      raise exception 'requester must belong to the requesting community' using errcode = '42501';
    end if;
    new.requester_id := coalesce(v_uid, new.requester_id);
    new.status := 'pending';
    new.decided_by := null;
    new.decided_at := null;
    new.created_at := now();
    return new;
  end if;

  new.resource_id := old.resource_id;
  new.requester_id := old.requester_id;
  new.created_at := old.created_at;
  if v_uid is null then
    return new;
  end if;
  new.requester_community_id := old.requester_community_id;
  new.decided_by := old.decided_by;
  new.decided_at := old.decided_at;
  if (new.message, new.starts_on, new.ends_on) is distinct from (old.message, old.starts_on, old.ends_on)
     and (v_uid <> old.requester_id or old.status <> 'pending') then
    raise exception 'request details can only be edited by the requester while pending' using errcode = '42501';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if v_uid = old.requester_id and new.status = 'cancelled' and old.status in ('pending', 'approved') then
    return new;
  end if;
  if public.is_community_admin(v_res.community_id) and (
       (old.status = 'pending' and new.status in ('approved', 'declined'))
       or (old.status = 'approved' and new.status = 'returned')) then
    new.decided_by := v_uid;
    new.decided_at := now();
    return new;
  end if;
  raise exception 'invalid resource request transition % -> %', old.status, new.status using errcode = '42501';
end;
$$;

-- [Baixo] Recursos: autor imutável + rate limit.
create or replace function public.resources_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('resource.create', 20, interval '1 day');
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.created_by := old.created_by;
    new.community_id := old.community_id;
  end if;
  return new;
end;
$$;
create trigger resources_before_write before insert or update on public.resources
for each row execute function public.resources_before_write();

-- [Baixo] Verificações: notas de revisão só pelo admin; rate limit; rejeitar novo pedido não "desverifica".
create or replace function public.community_verifications_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('verification.request', 5, interval '1 day');
    new.requested_by := coalesce((select auth.uid()), new.requested_by);
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_notes := null;
    new.created_at := now();
    return new;
  end if;
  if not public.is_admin() then
    raise exception 'only platform admins can review verifications' using errcode = '42501';
  end if;
  if old.status <> 'pending' then
    raise exception 'verification already reviewed' using errcode = '23514';
  end if;
  new.community_id := old.community_id;
  new.requested_by := old.requested_by;
  new.evidence := old.evidence;
  new.created_at := old.created_at;
  new.reviewed_by := (select auth.uid());
  new.reviewed_at := now();
  return new;
end;
$$;

create or replace function public.community_verifications_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'approved' then
    update public.communities set status = 'verified', verified_at = now() where id = new.community_id;
  else
    update public.communities set status = 'rejected', verified_at = null
    where id = new.community_id and status <> 'verified';
  end if;
  perform public.notify_user(new.requested_by, 'community.verification_' || new.status::text,
    jsonb_build_object('community_id', new.community_id));
  perform public.log_audit('community.verification_' || new.status::text, 'community', new.community_id::text,
    jsonb_build_object('verification_id', new.id, 'notes', new.review_notes));
  return new;
end;
$$;

-- Comunidades criadas pelo serviço (seed/backoffice, sem JWT) podem definir status.
create or replace function public.communities_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('community.create', 5, interval '1 day');
    new.created_by := coalesce(v_uid, new.created_by);
    if v_uid is not null and not public.is_admin() then
      new.status := 'pending';
      new.verified_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if (new.status is distinct from old.status or new.verified_at is distinct from old.verified_at)
       and v_uid is not null and not public.is_admin() then
      raise exception 'only platform admins can change community status' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- [Baixo] Consentimento e onboarding não podem ser retroativos.
create or replace function public.profiles_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if (select auth.uid()) is null then
    return new;
  end if;
  if old.terms_accepted_at is not null then new.terms_accepted_at := old.terms_accepted_at;
  elsif new.terms_accepted_at is not null then new.terms_accepted_at := now(); end if;
  if old.privacy_accepted_at is not null then new.privacy_accepted_at := old.privacy_accepted_at;
  elsif new.privacy_accepted_at is not null then new.privacy_accepted_at := now(); end if;
  if old.onboarded_at is not null then new.onboarded_at := old.onboarded_at;
  elsif new.onboarded_at is not null then new.onboarded_at := now(); end if;
  return new;
end;
$$;
create trigger profiles_before_update before update on public.profiles
for each row execute function public.profiles_before_update();

-- [Baixo] Rate limits adicionais em inserções que não tinham limite.
create or replace function public.generic_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enforce_rate_limit(tg_argv[0], tg_argv[1]::integer, tg_argv[2]::interval);
  return new;
end;
$$;
create trigger portfolio_items_rate before insert on public.portfolio_items
  for each row execute function public.generic_rate_limit('portfolio.create', '30', '1 day');
create trigger blocks_rate before insert on public.blocks
  for each row execute function public.generic_rate_limit('block.create', '50', '1 hour');
create trigger profile_skills_rate before insert on public.profile_skills
  for each row execute function public.generic_rate_limit('profile_skill.create', '120', '1 hour');
create trigger opportunity_skills_rate before insert on public.opportunity_skills
  for each row execute function public.generic_rate_limit('opportunity_skill.create', '200', '1 hour');

-- Limite de itens de portfólio por pessoa.
create or replace function public.portfolio_items_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.portfolio_items where profile_id = new.profile_id) >= 50 then
    raise exception 'portfolio limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger portfolio_items_cap before insert on public.portfolio_items
  for each row execute function public.portfolio_items_cap();

-- [Baixo] Conversa só pode referenciar oportunidade visível ao criador.
create or replace function public.conversations_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.opportunity_id is not null and not exists (
    select 1 from public.opportunities o
    where o.id = new.opportunity_id
      and (o.status in ('open', 'closed') or public.is_community_admin(o.community_id))
  ) then
    new.opportunity_id := null;
  end if;
  return new;
end;
$$;
create trigger conversations_before_insert before insert on public.conversations
  for each row execute function public.conversations_before_insert();

-- [Baixo] Moderadores não reescrevem conteúdo de oportunidades; só alteram status.
drop policy opportunities_update on public.opportunities;
create policy opportunities_update on public.opportunities for update to authenticated
  using (public.is_community_admin(community_id) or public.is_moderator())
  with check (public.is_community_admin(community_id) or public.is_moderator());
create or replace function public.opportunities_moderator_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_community_admin(old.community_id)
     and (new.title, new.description, new.mode, new.country_code, new.city, new.languages, new.availability, new.slots, new.starts_at, new.ends_at)
         is distinct from
         (old.title, old.description, old.mode, old.country_code, old.city, old.languages, old.availability, old.slots, old.starts_at, old.ends_at) then
    raise exception 'moderators can only change opportunity status' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger opportunities_moderator_guard before update on public.opportunities
  for each row execute function public.opportunities_moderator_guard();

-- Funções de trigger não são RPCs.
revoke execute on function public.generic_rate_limit() from public, anon, authenticated;
