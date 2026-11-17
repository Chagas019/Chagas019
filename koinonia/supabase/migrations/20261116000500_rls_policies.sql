-- KOINONIA — 0005: Row Level Security.
-- Regra geral: RLS ligado em TODAS as tabelas; sem política = sem acesso.
-- anon nunca escreve; regras de transição de estado ficam nos triggers (0004).

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- ===== profiles =================================================================
create policy profiles_select_public on public.profiles for select to anon
  using (visibility = 'public' and onboarded_at is not null);
create policy profiles_select_auth on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (visibility in ('public', 'members') and onboarded_at is not null)
    or public.is_moderator()
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- insert é feito pelo trigger handle_new_user; delete via exclusão da conta (auth.users)

-- ===== profile_private (somente o dono) =========================================
create policy profile_private_own on public.profile_private for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ===== user_roles ===============================================================
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
  with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
  using (public.is_admin() and user_id <> (select auth.uid()));

-- ===== catálogo de talentos (leitura pública, escrita admin) ====================
create policy skill_categories_read on public.skill_categories for select to anon, authenticated using (true);
create policy skill_categories_admin on public.skill_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy skills_read on public.skills for select to anon, authenticated using (true);
create policy skills_admin on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ===== profile_skills / portfolio (seguem a visibilidade do perfil) ============
create policy profile_skills_read on public.profile_skills for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id));
create policy profile_skills_own on public.profile_skills for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy portfolio_read on public.portfolio_items for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id));
create policy portfolio_own on public.portfolio_items for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- ===== communities ==============================================================
create policy communities_read_public on public.communities for select to anon
  using (status = 'verified');
create policy communities_read_auth on public.communities for select to authenticated
  -- created_by: necessário para INSERT ... RETURNING (a associação como owner ocorre no trigger AFTER)
  using (status = 'verified' or created_by = (select auth.uid()) or public.is_community_member(id) or public.is_moderator());
create policy communities_insert on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy communities_update on public.communities for update to authenticated
  using (public.is_community_admin(id) or public.is_admin())
  with check (public.is_community_admin(id) or public.is_admin());
create policy communities_delete on public.communities for delete to authenticated
  using (public.is_admin() or exists (
    select 1 from public.community_members m
    where m.community_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));

-- ===== community_members ========================================================
create policy community_members_read on public.community_members for select to anon, authenticated
  using (exists (select 1 from public.communities c where c.id = community_id));
create policy community_members_join on public.community_members for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and role = 'member'
      and exists (select 1 from public.communities c where c.id = community_id and c.status = 'verified'))
    or public.is_community_admin(community_id)
  );
create policy community_members_update on public.community_members for update to authenticated
  using (public.is_community_admin(community_id)) with check (public.is_community_admin(community_id));
create policy community_members_leave on public.community_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_community_admin(community_id));

-- ===== community_verifications ==================================================
create policy verifications_read on public.community_verifications for select to authenticated
  using (public.is_community_admin(community_id) or public.is_admin());
create policy verifications_request on public.community_verifications for insert to authenticated
  with check (public.is_community_admin(community_id));
create policy verifications_review on public.community_verifications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ===== opportunities ============================================================
-- a subconsulta em communities aplica o RLS de communities (comunidade visível ao leitor)
create policy opportunities_read_public on public.opportunities for select to anon
  using (status in ('open', 'closed') and exists (select 1 from public.communities c where c.id = community_id));
create policy opportunities_read_auth on public.opportunities for select to authenticated
  using (
    (status in ('open', 'closed') and exists (select 1 from public.communities c where c.id = community_id))
    or public.is_community_admin(community_id) or public.is_moderator()
  );
create policy opportunities_write on public.opportunities for insert to authenticated
  with check (public.is_community_admin(community_id) and created_by = (select auth.uid()));
create policy opportunities_update on public.opportunities for update to authenticated
  using (public.is_community_admin(community_id) or public.is_moderator())
  with check (public.is_community_admin(community_id) or public.is_moderator());
create policy opportunities_delete on public.opportunities for delete to authenticated
  using (public.is_community_admin(community_id) or public.is_admin());

create policy opportunity_skills_read on public.opportunity_skills for select to anon, authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy opportunity_skills_write on public.opportunity_skills for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_community_admin(o.community_id)))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_community_admin(o.community_id)));

-- ===== applications =============================================================
create policy applications_read on public.applications for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_community_admin(o.community_id))
  );
create policy applications_insert on public.applications for insert to authenticated
  with check (applicant_id = (select auth.uid()));
create policy applications_update on public.applications for update to authenticated
  using (
    applicant_id = (select auth.uid())
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_community_admin(o.community_id))
  );

-- ===== conversations / messages (criação via RPC start_conversation) ===========
create policy conversations_read on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));
create policy conversation_participants_read on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_participant(conversation_id));

-- ===== blocks ===================================================================
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

-- ===== resources ================================================================
create policy resources_read on public.resources for select to authenticated
  using (
    exists (select 1 from public.communities c where c.id = community_id and c.status = 'verified')
    or public.is_community_member(community_id)
  );
create policy resources_write on public.resources for insert to authenticated
  with check (public.is_community_admin(community_id) and created_by = (select auth.uid()));
create policy resources_update on public.resources for update to authenticated
  using (public.is_community_admin(community_id)) with check (public.is_community_admin(community_id));
create policy resources_delete on public.resources for delete to authenticated
  using (public.is_community_admin(community_id) or public.is_admin());

create policy resource_requests_read on public.resource_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.resources r where r.id = resource_id and public.is_community_admin(r.community_id))
  );
create policy resource_requests_insert on public.resource_requests for insert to authenticated
  with check (requester_id = (select auth.uid()));
create policy resource_requests_update on public.resource_requests for update to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (select 1 from public.resources r where r.id = resource_id and public.is_community_admin(r.community_id))
  );

-- ===== reviews (públicas para leitura) =========================================
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()));
create policy reviews_moderate on public.reviews for delete to authenticated
  using (public.is_moderator());

-- ===== notifications ============================================================
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ===== reports ==================================================================
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());
create policy reports_update on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- ===== audit_log (somente admins leem; ninguém escreve diretamente) ============
create policy audit_log_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());

-- rate_limit_events: sem políticas = inacessível pela API.
