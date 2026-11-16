-- KOINONIA — 0004: funções auxiliares, triggers e regras de negócio no banco.
-- Funções SECURITY DEFINER usam search_path vazio e nomes totalmente qualificados.

-- ===== Helpers de autorização ==================================================
create or replace function public.has_platform_role(p_role public.platform_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and (role = p_role or role = 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_platform_role('admin');
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_platform_role('moderator');
$$;

create or replace function public.is_community_member(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_community_admin(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_conversation_participant(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ===== Auditoria, notificações e rate limit ====================================
create or replace function public.log_audit(p_action text, p_entity text, p_entity_id text, p_metadata jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, metadata)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'));
$$;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.notify_user(p_user uuid, p_kind text, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, payload) values (p_user, p_kind, coalesce(p_payload, '{}'));
$$;
revoke execute on function public.notify_user(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.enforce_rate_limit(p_action text, p_max integer, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
begin
  if v_user is null then
    return; -- operações de serviço (sem JWT) não são limitadas
  end if;
  select count(*) into v_count from public.rate_limit_events
  where user_id = v_user and action = p_action and created_at > now() - p_window;
  if v_count >= p_max then
    raise exception 'rate_limited' using errcode = 'P0429', hint = p_action;
  end if;
  insert into public.rate_limit_events (user_id, action) values (v_user, p_action);
end;
$$;
revoke execute on function public.enforce_rate_limit(text, integer, interval) from public, anon, authenticated;

-- ===== updated_at ==============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'profile_private', 'communities', 'opportunities', 'applications', 'resources', 'resource_requests']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ===== Novo usuário → perfil ===================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- consentimento registrado no cadastro (checkboxes obrigatórios de termos e privacidade)
  insert into public.profiles (id, display_name, preferred_locale, terms_accepted_at, privacy_accepted_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80),
    case when new.raw_user_meta_data ->> 'locale' in ('pt-BR', 'en', 'es') then new.raw_user_meta_data ->> 'locale' else 'pt-BR' end,
    case when new.raw_user_meta_data ? 'consent_version' then now() end,
    case when new.raw_user_meta_data ? 'consent_version' then now() end
  );
  insert into public.profile_private (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== Comunidades =============================================================
-- Criador vira owner; status/verified_at só mudam por admin da plataforma.
create or replace function public.communities_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('community.create', 5, interval '1 day');
    new.created_by := coalesce((select auth.uid()), new.created_by);
    if not public.is_admin() then
      new.status := 'pending';
      new.verified_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    if (new.status is distinct from old.status or new.verified_at is distinct from old.verified_at)
       and not public.is_admin() and (select auth.uid()) is not null then
      raise exception 'only platform admins can change community status' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger communities_before_write
before insert or update on public.communities
for each row execute function public.communities_before_write();

create or replace function public.communities_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  perform public.log_audit('community.created', 'community', new.id::text, jsonb_build_object('name', new.name));
  return new;
end;
$$;
create trigger communities_after_insert
after insert on public.communities
for each row execute function public.communities_after_insert();

-- Comunidade sempre mantém pelo menos um owner.
create or replace function public.community_members_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owners integer;
begin
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
    -- apenas owners promovem outros a owner
    if new.role = 'owner' and old.role <> 'owner' and not exists (
      select 1 from public.community_members
      where community_id = old.community_id and user_id = (select auth.uid()) and role = 'owner'
    ) and not public.is_admin() then
      raise exception 'only owners can grant ownership' using errcode = '42501';
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger community_members_guard
before update or delete on public.community_members
for each row execute function public.community_members_guard();

-- Verificação: aprovação por admin atualiza a comunidade, notifica e audita.
create or replace function public.community_verifications_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.requested_by := coalesce((select auth.uid()), new.requested_by);
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
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
  new.reviewed_by := (select auth.uid());
  new.reviewed_at := now();
  return new;
end;
$$;
create trigger community_verifications_before_write
before insert or update on public.community_verifications
for each row execute function public.community_verifications_before_write();

create or replace function public.community_verifications_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;
  update public.communities
     set status = case when new.status = 'approved' then 'verified'::public.community_status else 'rejected'::public.community_status end,
         verified_at = case when new.status = 'approved' then now() else null end
   where id = new.community_id;
  perform public.notify_user(new.requested_by, 'community.verification_' || new.status::text,
    jsonb_build_object('community_id', new.community_id));
  perform public.log_audit('community.verification_' || new.status::text, 'community', new.community_id::text,
    jsonb_build_object('verification_id', new.id, 'notes', new.review_notes));
  return new;
end;
$$;
create trigger community_verifications_after_update
after update on public.community_verifications
for each row execute function public.community_verifications_after_update();

-- ===== Oportunidades ===========================================================
create or replace function public.opportunities_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_status public.community_status;
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('opportunity.create', 20, interval '1 day');
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.community_id := old.community_id;
    new.created_by := old.created_by;
  end if;
  -- Só comunidades verificadas publicam (status open).
  if new.status = 'open' then
    select status into v_status from public.communities where id = new.community_id;
    if v_status is distinct from 'verified' then
      raise exception 'community must be verified to publish opportunities' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger opportunities_before_write
before insert or update on public.opportunities
for each row execute function public.opportunities_before_write();

-- ===== Candidaturas ============================================================
-- Transições permitidas:
--   candidato: pending|accepted → withdrawn
--   admin da comunidade: pending → accepted|rejected; accepted → completed
create or replace function public.applications_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_opp record;
  v_is_admin boolean;
begin
  select o.id, o.community_id, o.status, o.title into v_opp
  from public.opportunities o where o.id = coalesce(new.opportunity_id, old.opportunity_id);

  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('application.create', 20, interval '1 hour');
    if v_opp.status is distinct from 'open' then
      raise exception 'opportunity is not open' using errcode = '23514';
    end if;
    new.status := 'pending';
    new.decided_by := null;
    new.decided_at := null;
    new.completed_at := null;
    return new;
  end if;

  new.opportunity_id := old.opportunity_id;
  new.applicant_id := old.applicant_id;
  if new.status = old.status then
    -- candidato pode editar a mensagem enquanto pendente
    if new.message is distinct from old.message and (v_uid is distinct from old.applicant_id or old.status <> 'pending') then
      raise exception 'message can only be edited by the applicant while pending' using errcode = '42501';
    end if;
    return new;
  end if;

  v_is_admin := public.is_community_admin(v_opp.community_id);
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
  if v_uid is null then
    return new; -- service role
  end if;
  raise exception 'invalid application status transition % -> %', old.status, new.status using errcode = '42501';
end;
$$;
create trigger applications_before_write
before insert or update on public.applications
for each row execute function public.applications_before_write();

create or replace function public.applications_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_opp record; v_admin record;
begin
  select id, community_id, title into v_opp from public.opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' then
    for v_admin in
      select user_id from public.community_members where community_id = v_opp.community_id and role in ('owner', 'admin')
    loop
      perform public.notify_user(v_admin.user_id, 'application.received',
        jsonb_build_object('application_id', new.id, 'opportunity_id', v_opp.id, 'opportunity_title', v_opp.title));
    end loop;
  elsif new.status is distinct from old.status and new.status in ('accepted', 'rejected', 'completed') then
    perform public.notify_user(new.applicant_id, 'application.' || new.status::text,
      jsonb_build_object('application_id', new.id, 'opportunity_id', v_opp.id, 'opportunity_title', v_opp.title));
  end if;
  return new;
end;
$$;
create trigger applications_after_write
after insert or update on public.applications
for each row execute function public.applications_after_write();

-- ===== Mensagens ===============================================================
create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enforce_rate_limit('message.send', 30, interval '1 minute');
  new.sender_id := coalesce((select auth.uid()), new.sender_id);
  new.created_at := now();
  if exists (
    select 1 from public.conversation_participants p
    where p.conversation_id = new.conversation_id and p.user_id <> new.sender_id
      and public.is_blocked_between(p.user_id, new.sender_id)
  ) then
    raise exception 'cannot message a blocked user' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_before_insert
before insert on public.messages
for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_p record;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  for v_p in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    -- agrupa: só notifica se não houver notificação de mensagem não lida desta conversa
    if not exists (
      select 1 from public.notifications
      where user_id = v_p.user_id and kind = 'message.received' and read_at is null
        and payload ->> 'conversation_id' = new.conversation_id::text
    ) then
      perform public.notify_user(v_p.user_id, 'message.received',
        jsonb_build_object('conversation_id', new.conversation_id, 'sender_id', new.sender_id));
    end if;
  end loop;
  return new;
end;
$$;
create trigger messages_after_insert
after insert on public.messages
for each row execute function public.messages_after_insert();

-- ===== Recursos ================================================================
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
    return new;
  end if;

  new.resource_id := old.resource_id;
  new.requester_id := old.requester_id;
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
  if v_uid is null then
    return new;
  end if;
  raise exception 'invalid resource request transition % -> %', old.status, new.status using errcode = '42501';
end;
$$;
create trigger resource_requests_before_write
before insert or update on public.resource_requests
for each row execute function public.resource_requests_before_write();

create or replace function public.resource_requests_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_res record; v_admin record;
begin
  select id, community_id, title into v_res from public.resources where id = new.resource_id;
  if tg_op = 'INSERT' then
    for v_admin in
      select user_id from public.community_members where community_id = v_res.community_id and role in ('owner', 'admin')
    loop
      perform public.notify_user(v_admin.user_id, 'resource_request.received',
        jsonb_build_object('request_id', new.id, 'resource_id', v_res.id, 'resource_title', v_res.title));
    end loop;
  elsif new.status is distinct from old.status and new.status in ('approved', 'declined') then
    perform public.notify_user(new.requester_id, 'resource_request.' || new.status::text,
      jsonb_build_object('request_id', new.id, 'resource_id', v_res.id, 'resource_title', v_res.title));
  end if;
  return new;
end;
$$;
create trigger resource_requests_after_write
after insert or update on public.resource_requests
for each row execute function public.resource_requests_after_write();

-- ===== Avaliações ==============================================================
create or replace function public.reviews_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_app record;
begin
  new.reviewer_id := coalesce((select auth.uid()), new.reviewer_id);
  select a.id, a.applicant_id, a.status, o.community_id into v_app
  from public.applications a join public.opportunities o on o.id = a.opportunity_id
  where a.id = new.application_id;

  if v_app.status is distinct from 'completed' then
    raise exception 'reviews are only allowed after a completed collaboration' using errcode = '23514';
  end if;
  if new.reviewer_id = v_app.applicant_id then
    -- voluntário avalia a comunidade
    if new.reviewee_community_id is distinct from v_app.community_id or new.reviewee_profile_id is not null then
      raise exception 'volunteer can only review the hosting community' using errcode = '42501';
    end if;
  elsif exists (
    select 1 from public.community_members
    where community_id = v_app.community_id and user_id = new.reviewer_id and role in ('owner', 'admin')
  ) then
    -- comunidade avalia o voluntário
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
create trigger reviews_before_insert
before insert on public.reviews
for each row execute function public.reviews_before_insert();

-- ===== Denúncias ===============================================================
create or replace function public.reports_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_rate_limit('report.create', 10, interval '1 hour');
    new.reporter_id := coalesce((select auth.uid()), new.reporter_id);
    new.status := 'open';
    new.handled_by := null;
    new.handled_at := null;
    new.resolution_notes := null;
    return new;
  end if;
  new.reporter_id := old.reporter_id;
  new.target_type := old.target_type;
  new.target_id := old.target_id;
  new.reason := old.reason;
  new.details := old.details;
  if new.status is distinct from old.status then
    new.handled_by := (select auth.uid());
    new.handled_at := now();
  end if;
  return new;
end;
$$;
create trigger reports_before_write
before insert or update on public.reports
for each row execute function public.reports_before_write();

create or replace function public.reports_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform public.log_audit('report.' || new.status::text, 'report', new.id::text,
      jsonb_build_object('target_type', new.target_type, 'target_id', new.target_id));
  end if;
  return new;
end;
$$;
create trigger reports_after_update
after update on public.reports
for each row execute function public.reports_after_update();

-- ===== Papéis de plataforma ====================================================
create or replace function public.user_roles_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('role.granted', 'user', new.user_id::text, jsonb_build_object('role', new.role));
    return new;
  end if;
  perform public.log_audit('role.revoked', 'user', old.user_id::text, jsonb_build_object('role', old.role));
  return old;
end;
$$;
create trigger user_roles_audit
after insert or delete on public.user_roles
for each row execute function public.user_roles_audit();

-- ===== Notificações: usuário só altera read_at =================================
create or replace function public.notifications_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.kind := old.kind;
  new.payload := old.payload;
  new.created_at := old.created_at;
  return new;
end;
$$;
create trigger notifications_before_update
before update on public.notifications
for each row execute function public.notifications_before_update();
