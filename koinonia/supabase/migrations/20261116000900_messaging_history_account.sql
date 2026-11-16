-- KOINONIA — 0009: leitura de conversas, histórico de colaborações e exclusão de conta.

-- Conversas do usuário com o outro participante, última mensagem e não lidas.
-- SECURITY DEFINER para mostrar nome/foto do interlocutor mesmo com perfil privado
-- (quem conversa já se conhece); sempre restrito a conversas de auth.uid().
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_name text, other_avatar text,
  last_body text, last_at timestamptz, unread integer
)
language sql stable security definer set search_path = '' as $$
  select c.id, o.user_id, p.display_name, p.avatar_url,
         left(lm.body, 140), coalesce(lm.created_at, c.created_at),
         (select count(*)::integer from public.messages m
           where m.conversation_id = c.id and m.sender_id <> (select auth.uid())
             and m.created_at > coalesce(me.last_read_at, '-infinity'))
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  join public.conversation_participants o on o.conversation_id = c.id and o.user_id <> me.user_id
  join public.profiles p on p.id = o.user_id
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
  order by coalesce(lm.created_at, c.created_at) desc
  limit 100;
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

create or replace function public.unread_message_count()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(unread), 0)::integer from public.my_conversations();
$$;
revoke execute on function public.unread_message_count() from public, anon;
grant execute on function public.unread_message_count() to authenticated;

-- Histórico público de colaborações concluídas, respeitando a visibilidade do perfil.
create or replace function public.collaboration_history(p_profile uuid)
returns table (application_id uuid, opportunity_id uuid, opportunity_title text, community_slug text, community_name text, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, o.id, o.title, c.slug, c.name, a.completed_at
  from public.applications a
  join public.opportunities o on o.id = a.opportunity_id
  join public.communities c on c.id = o.community_id
  join public.profiles p on p.id = a.applicant_id
  where a.applicant_id = p_profile and a.status = 'completed'
    and (
      p.id = (select auth.uid())
      or (p.onboarded_at is not null and p.visibility = 'public')
      or (p.onboarded_at is not null and p.visibility = 'members' and (select auth.uid()) is not null)
    )
  order by a.completed_at desc
  limit 50;
$$;
grant execute on function public.collaboration_history(uuid) to anon, authenticated;

-- Exclusão da própria conta (LGPD/GDPR). Remove auth.users; o resto cai em cascata.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.community_members m
    where m.user_id = v_uid and m.role = 'owner'
      and not exists (select 1 from public.community_members o
                      where o.community_id = m.community_id and o.role = 'owner' and o.user_id <> v_uid)
  ) then
    raise exception 'sole owner of a community' using errcode = '23514';
  end if;
  perform public.log_audit('account.deleted', 'user', v_uid::text, '{}');
  -- registros que referenciam auth.users sem cascata
  update public.community_verifications set reviewed_by = null where reviewed_by = v_uid;
  update public.applications set decided_by = null where decided_by = v_uid;
  update public.resource_requests set decided_by = null where decided_by = v_uid;
  update public.reports set handled_by = null where handled_by = v_uid;
  update public.user_roles set granted_by = null where granted_by = v_uid;
  delete from public.community_verifications where requested_by = v_uid;
  delete from public.conversations where created_by = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Conteúdo criado pela pessoa em nome de comunidades permanece com a comunidade:
-- created_by passa a aceitar nulo quando a conta é excluída.
alter table public.communities alter column created_by drop not null;
alter table public.opportunities alter column created_by drop not null;
alter table public.resources alter column created_by drop not null;
alter table public.conversations alter column created_by drop not null;
alter table public.communities drop constraint communities_created_by_fkey,
  add constraint communities_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.opportunities drop constraint opportunities_created_by_fkey,
  add constraint opportunities_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.resources drop constraint resources_created_by_fkey,
  add constraint resources_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
