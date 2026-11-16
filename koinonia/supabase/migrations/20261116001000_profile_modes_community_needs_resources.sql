-- KOINONIA — 0010: modalidade do voluntário, áreas/necessidades da comunidade,
-- novas categorias de recursos e disponibilidade. Somente alterações aditivas.

-- Modalidade de serviço do voluntário (presencial/remoto/híbrido)
alter table public.profiles add column if not exists service_modes public.opportunity_mode[] not null default '{}';

-- Comunidade: áreas de atuação (categorias de talento) e necessidades
alter table public.communities add column if not exists focus_categories smallint[] not null default '{}'
  check (cardinality(focus_categories) <= 10);
alter table public.communities add column if not exists needs text not null default ''
  check (char_length(needs) <= 2000);

-- Novas categorias de recursos
alter type public.resource_kind add value if not exists 'camera';
alter type public.resource_kind add value if not exists 'lens';
alter type public.resource_kind add value if not exists 'microphone';
alter type public.resource_kind add value if not exists 'event_structure';

-- Períodos ocupados de um recurso (apenas datas de pedidos aprovados; sem dados de quem pediu)
create or replace function public.resource_busy_ranges(p_resource uuid)
returns table (starts_on date, ends_on date)
language sql stable security definer set search_path = '' as $$
  select rr.starts_on, rr.ends_on
  from public.resource_requests rr
  join public.resources r on r.id = rr.resource_id
  join public.communities c on c.id = r.community_id
  where rr.resource_id = p_resource and rr.status = 'approved' and rr.ends_on >= current_date
    and (select auth.uid()) is not null
    and (c.status = 'verified' or public.is_community_member(c.id))
  order by rr.starts_on
  limit 50;
$$;
revoke execute on function public.resource_busy_ranges(uuid) from public, anon;
grant execute on function public.resource_busy_ranges(uuid) to authenticated;

-- Match: a modalidade preferida do voluntário entra na pontuação de localização.
-- Se o voluntário só atende de forma remota, oportunidades presenciais não pontuam localização (e vice-versa).
create or replace function public.match_score(
  p_profile_skills integer[], p_opp_skills integer[],
  p_profile_langs text[], p_opp_langs text[],
  p_profile_country char(2), p_profile_city text,
  p_mode public.opportunity_mode, p_opp_country char(2), p_opp_city text,
  p_profile_avail public.availability_slot[], p_opp_avail public.availability_slot[],
  p_profile_modes public.opportunity_mode[]
)
returns numeric language sql immutable set search_path = '' as $$
  select round(
    50 * case when coalesce(cardinality(p_opp_skills), 0) = 0 then 0.5
              else (select count(*) from unnest(p_opp_skills) s where s = any (p_profile_skills))::numeric / cardinality(p_opp_skills) end
    + 20 * case when coalesce(cardinality(p_opp_langs), 0) = 0 then 1
                when p_profile_langs && p_opp_langs then 1 else 0 end
    + 20 * case when coalesce(cardinality(p_profile_modes), 0) > 0
                     and not (p_mode = any (p_profile_modes) or (p_mode = 'hybrid' and cardinality(p_profile_modes) > 0)) then 0
                when p_mode = 'remote' then 1
                when p_profile_country is not null and p_profile_country = p_opp_country
                     and p_opp_city is not null and lower(btrim(p_profile_city)) = lower(btrim(p_opp_city)) then 1
                when p_profile_country is not null and p_profile_country = p_opp_country then 0.5
                when p_mode = 'hybrid' then 0.25
                else 0 end
    + 10 * case when coalesce(cardinality(p_opp_avail), 0) = 0 then 1
                when 'flexible' = any (p_profile_avail) then 1
                when p_profile_avail && p_opp_avail then 1 else 0 end
  , 1);
$$;

create or replace function public.match_opportunities_for_me(p_limit integer default 12)
returns table (opportunity_id uuid, score numeric)
language sql stable security invoker set search_path = '' as $$
  with me as (
    select p.*, coalesce(array(select ps.skill_id from public.profile_skills ps where ps.profile_id = p.id), '{}') as skill_ids
    from public.profiles p where p.id = (select auth.uid())
  )
  select o.id,
         public.match_score(me.skill_ids,
           coalesce(array(select os.skill_id from public.opportunity_skills os where os.opportunity_id = o.id), '{}'),
           me.languages, o.languages, me.country_code, me.city, o.mode, o.country_code, o.city,
           me.availability, o.availability, me.service_modes) as score
  from public.opportunities o cross join me
  where o.status = 'open'
    and (o.ends_at is null or o.ends_at > now())
    and not exists (select 1 from public.applications a where a.opportunity_id = o.id and a.applicant_id = me.id)
    and not public.is_community_member(o.community_id)
  order by score desc, o.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

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
             p.availability, v_opp.availability, p.service_modes) as score
    from public.profiles p
    where p.onboarded_at is not null and p.visibility <> 'private'
      and p.id <> (select auth.uid())
      and not exists (select 1 from public.applications a where a.opportunity_id = p_opportunity and a.applicant_id = p.id)
      and not public.is_blocked_between((select auth.uid()), p.id)
    order by score desc, p.updated_at desc
    limit least(greatest(p_limit, 1), 50);
end;
$$;

drop function if exists public.match_score(integer[], integer[], text[], text[], char, text, public.opportunity_mode, char, text, public.availability_slot[], public.availability_slot[]);

-- Busca de talentos: filtro por modalidade e retorno da modalidade
drop function if exists public.search_volunteers(text, smallint, integer, text[], char, public.availability_slot[], integer, integer);
create function public.search_volunteers(
  p_query text default null,
  p_category smallint default null,
  p_skill integer default null,
  p_languages text[] default null,
  p_country char(2) default null,
  p_availability public.availability_slot[] default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_modes public.opportunity_mode[] default null
)
returns table (
  id uuid, username citext, display_name text, bio text, avatar_url text,
  country_code char(2), city text, languages text[], availability public.availability_slot[],
  service_modes public.opportunity_mode[], skill_names jsonb
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, left(p.bio, 280), p.avatar_url,
         p.country_code, p.city, p.languages, p.availability, p.service_modes,
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
    and (p_modes is null or cardinality(p_modes) = 0 or p.service_modes && p_modes or cardinality(p.service_modes) = 0)
    and (p_skill is null or exists (select 1 from public.profile_skills ps where ps.profile_id = p.id and ps.skill_id = p_skill))
    and (p_category is null or exists (
      select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p.id and s.category_id = p_category))
    and ((select auth.uid()) is null or not public.is_blocked_between((select auth.uid()), p.id))
  order by p.updated_at desc, p.id
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_volunteers(text, smallint, integer, text[], char, public.availability_slot[], integer, integer, public.opportunity_mode[]) to anon, authenticated;
