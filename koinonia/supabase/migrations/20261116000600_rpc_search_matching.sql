-- KOINONIA — 0006: RPCs (conversas, busca e Match Missionário).
-- Funções de leitura são SECURITY INVOKER: o RLS do chamador continua valendo.

-- ===== Conversas ================================================================
create or replace function public.start_conversation(p_other uuid, p_opportunity uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_conv uuid;
  v_perm public.message_permission;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_other = v_me then
    raise exception 'cannot start a conversation with yourself' using errcode = '22023';
  end if;
  if public.is_blocked_between(v_me, p_other) then
    raise exception 'cannot message a blocked user' using errcode = '42501';
  end if;

  -- reutiliza conversa 1:1 existente
  select cp1.conversation_id into v_conv
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.user_id = v_me and cp2.user_id = p_other
    and (select count(*) from public.conversation_participants c where c.conversation_id = cp1.conversation_id) = 2
  limit 1;
  if v_conv is not null then
    return v_conv;
  end if;

  select message_permission into v_perm from public.profiles where id = p_other and onboarded_at is not null;
  if v_perm is null then
    raise exception 'recipient not found' using errcode = 'P0002';
  end if;
  if v_perm = 'nobody' then
    raise exception 'recipient does not accept messages' using errcode = '42501';
  end if;
  if v_perm = 'verified_communities' and not exists (
    select 1 from public.community_members m join public.communities c on c.id = m.community_id
    where m.user_id = v_me and m.role in ('owner', 'admin') and c.status = 'verified'
  ) then
    raise exception 'recipient only accepts messages from verified communities' using errcode = '42501';
  end if;

  perform public.enforce_rate_limit('conversation.create', 20, interval '1 hour');
  insert into public.conversations (created_by, opportunity_id) values (v_me, p_opportunity) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id) values (v_conv, v_me), (v_conv, p_other);
  return v_conv;
end;
$$;
revoke execute on function public.start_conversation(uuid, uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversation_participants set last_read_at = now()
  where conversation_id = p_conversation and user_id = (select auth.uid());
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and kind = 'message.received' and read_at is null
    and payload ->> 'conversation_id' = p_conversation::text;
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ===== Busca global de talentos ================================================
create or replace function public.search_volunteers(
  p_query text default null,
  p_category smallint default null,
  p_skill integer default null,
  p_languages text[] default null,
  p_country char(2) default null,
  p_availability public.availability_slot[] default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, username citext, display_name text, bio text, avatar_url text,
  country_code char(2), city text, languages text[], availability public.availability_slot[],
  skill_names jsonb
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, left(p.bio, 280), p.avatar_url,
         p.country_code, p.city, p.languages, p.availability,
         coalesce((
           select jsonb_agg(s.names order by s.id) from public.profile_skills ps
           join public.skills s on s.id = ps.skill_id where ps.profile_id = p.id
         ), '[]'::jsonb)
  from public.profiles p
  where p.onboarded_at is not null
    and p.visibility <> 'private'
    and (p_query is null or btrim(p_query) = '' or p.search_document @@ plainto_tsquery('simple', p_query)
         or p.display_name ilike '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_country is null or p.country_code = p_country)
    and (p_languages is null or cardinality(p_languages) = 0 or p.languages && p_languages)
    and (p_availability is null or cardinality(p_availability) = 0 or p.availability && p_availability
         or 'flexible' = any (p.availability))
    and (p_skill is null or exists (select 1 from public.profile_skills ps where ps.profile_id = p.id and ps.skill_id = p_skill))
    and (p_category is null or exists (
      select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p.id and s.category_id = p_category))
    and ((select auth.uid()) is null or not public.is_blocked_between((select auth.uid()), p.id))
  order by p.updated_at desc, p.id
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_volunteers(text, smallint, integer, text[], char, public.availability_slot[], integer, integer) to anon, authenticated;

-- ===== Match Missionário ========================================================
-- Pontuação 0..100 (mesmos pesos de src/features/matching/score.ts):
--   talentos 50 · idiomas 20 · localização 20 · disponibilidade 10
create or replace function public.match_score(
  p_profile_skills integer[], p_opp_skills integer[],
  p_profile_langs text[], p_opp_langs text[],
  p_profile_country char(2), p_profile_city text,
  p_mode public.opportunity_mode, p_opp_country char(2), p_opp_city text,
  p_profile_avail public.availability_slot[], p_opp_avail public.availability_slot[]
)
returns numeric language sql immutable set search_path = '' as $$
  select round(
    -- talentos: fração das habilidades pedidas que o voluntário tem
    50 * case when coalesce(cardinality(p_opp_skills), 0) = 0 then 0.5
              else (select count(*) from unnest(p_opp_skills) s where s = any (p_profile_skills))::numeric / cardinality(p_opp_skills) end
    -- idiomas: pelo menos um em comum (ou oportunidade sem exigência)
    + 20 * case when coalesce(cardinality(p_opp_langs), 0) = 0 then 1
                when p_profile_langs && p_opp_langs then 1 else 0 end
    -- localização: remoto vale integral; presencial/híbrido por país/cidade
    + 20 * case when p_mode = 'remote' then 1
                when p_profile_country is not null and p_profile_country = p_opp_country
                     and p_opp_city is not null and lower(btrim(p_profile_city)) = lower(btrim(p_opp_city)) then 1
                when p_profile_country is not null and p_profile_country = p_opp_country then 0.5
                when p_mode = 'hybrid' then 0.25
                else 0 end
    -- disponibilidade
    + 10 * case when coalesce(cardinality(p_opp_avail), 0) = 0 then 1
                when 'flexible' = any (p_profile_avail) then 1
                when p_profile_avail && p_opp_avail then 1 else 0 end
  , 1);
$$;

create or replace function public.match_opportunities_for_me(p_limit integer default 12)
returns table (opportunity_id uuid, score numeric)
language sql stable security invoker set search_path = '' as $$
  with me as (
    select p.*, coalesce(array(select skill_id from public.profile_skills where profile_id = p.id), '{}') as skill_ids
    from public.profiles p where p.id = (select auth.uid())
  )
  select o.id,
         public.match_score(me.skill_ids,
           coalesce(array(select skill_id from public.opportunity_skills where opportunity_id = o.id), '{}'),
           me.languages, o.languages, me.country_code, me.city, o.mode, o.country_code, o.city,
           me.availability, o.availability) as score
  from public.opportunities o cross join me
  where o.status = 'open'
    and (o.ends_at is null or o.ends_at > now())
    and not exists (select 1 from public.applications a where a.opportunity_id = o.id and a.applicant_id = me.id)
    and not public.is_community_member(o.community_id)
  order by score desc, o.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
revoke execute on function public.match_opportunities_for_me(integer) from public, anon;
grant execute on function public.match_opportunities_for_me(integer) to authenticated;

create or replace function public.match_volunteers_for_opportunity(p_opportunity uuid, p_limit integer default 12)
returns table (profile_id uuid, score numeric)
language plpgsql stable security invoker set search_path = '' as $$
declare v_opp record; v_skills integer[];
begin
  select * into v_opp from public.opportunities o where o.id = p_opportunity;
  if v_opp.id is null or not public.is_community_admin(v_opp.community_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_skills := coalesce(array(select os.skill_id from public.opportunity_skills os where os.opportunity_id = p_opportunity), '{}');
  return query
    select p.id,
           public.match_score(coalesce(array(select ps.skill_id from public.profile_skills ps where ps.profile_id = p.id), '{}'),
             v_skills, p.languages, v_opp.languages, p.country_code, p.city, v_opp.mode, v_opp.country_code, v_opp.city,
             p.availability, v_opp.availability) as score
    from public.profiles p
    where p.onboarded_at is not null and p.visibility <> 'private'
      and p.id <> (select auth.uid())
      and not exists (select 1 from public.applications a where a.opportunity_id = p_opportunity and a.applicant_id = p.id)
      and not public.is_blocked_between((select auth.uid()), p.id)
    order by score desc, p.updated_at desc
    limit least(greatest(p_limit, 1), 50);
end;
$$;
revoke execute on function public.match_volunteers_for_opportunity(uuid, integer) from public, anon;
grant execute on function public.match_volunteers_for_opportunity(uuid, integer) to authenticated;

-- Funções auxiliares internas não devem ser chamáveis pela API pública.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
