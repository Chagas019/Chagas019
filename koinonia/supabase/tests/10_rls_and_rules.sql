-- Testes de integração do banco: RLS, transições de estado, rate limit e matching.
-- Cada bloco simula um usuário via request.jwt.claim.sub + role authenticated/anon.
\set ON_ERROR_STOP 1

-- helper: espera que um comando falhe
create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok (expected error) %: %', p_label, sqlerrm;
    return;
  end;
  raise exception 'EXPECTED ERROR BUT SUCCEEDED: %', p_label;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

-- ===== Fixtures (como superusuário) ============================================
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.local', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.local',   '{"display_name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.local', '{"display_name":"Carol"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@test.local',  '{"display_name":"Dave"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000c', 'admin');

update public.profiles set onboarded_at = now(), visibility = 'public', country_code = 'BR', city = 'Campinas',
  languages = '{pt,en}', availability = '{weekends}' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set onboarded_at = now(), visibility = 'members', country_code = 'BR', city = 'São Paulo',
  languages = '{pt}' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set onboarded_at = now(), visibility = 'private' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set onboarded_at = now() where id = '00000000-0000-0000-0000-00000000000c';
update public.profile_private set phone = '+55 19 99999-0000' where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.profile_skills (profile_id, skill_id)
  select '00000000-0000-0000-0000-00000000000a', id from public.skills where slug in ('guitar', 'vocals');

do $$ begin
  assert (select count(*) from public.profiles) = 4, 'handle_new_user should create 4 profiles';
  assert (select count(*) from public.profile_private) = 4, 'handle_new_user should create private rows';
end $$;

-- ===== Alice (voluntária) =====================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000d') = 0, 'private profile must be hidden';
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 1, 'members profile visible to members';
  assert (select count(*) from public.profile_private) = 1, 'only own private row visible';
  assert (select count(*) from public.user_roles) = 0, 'cannot see others roles';
end $$;
select pg_temp.expect_error($q$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin')$q$, 'self-promotion to admin');
update public.profile_private set phone = 'x' where user_id = '00000000-0000-0000-0000-00000000000b';
do $$ begin assert (select count(*) from public.audit_log) = 0, 'audit log hidden from non-admins'; end $$;
reset role;
do $$ begin
  assert (select phone from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000b') is null, 'cannot write others private data';
end $$;

-- ===== Bob cria comunidade =====================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.communities (id, slug, name, kind, country_code, city, created_by, status)
values ('10000000-0000-0000-0000-000000000001', 'paroquia-sao-jose', 'Paróquia São José', 'parish', 'BR', 'São Paulo',
        '00000000-0000-0000-0000-00000000000b', 'verified'); -- tenta se autoverificar
do $$ begin
  assert (select status from public.communities where id = '10000000-0000-0000-0000-000000000001') = 'pending', 'status forced to pending';
  assert (select role from public.community_members where community_id = '10000000-0000-0000-0000-000000000001'
          and user_id = '00000000-0000-0000-0000-00000000000b') = 'owner', 'creator becomes owner';
end $$;
select pg_temp.expect_error($q$update public.communities set status = 'verified' where id = '10000000-0000-0000-0000-000000000001'$q$, 'owner cannot verify');
select pg_temp.expect_error($q$insert into public.opportunities (community_id, created_by, title, description, mode, status)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Músicos para a missa', 'Precisamos de músicos para as missas de domingo.', 'remote', 'open')$q$,
  'unverified community cannot publish');
select pg_temp.expect_error($q$delete from public.community_members where community_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000b'$q$, 'last owner cannot leave');
insert into public.community_verifications (id, community_id, requested_by, evidence)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
        'CNPJ da mitra e carta do pároco anexada ao processo de verificação.');

-- Alice não vê comunidade pendente nem pode aprovar
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.communities) = 0, 'pending community hidden';
  assert (select count(*) from public.community_verifications) = 0, 'verifications hidden';
end $$;
update public.community_verifications set status = 'approved';
select pg_temp.expect_error($q$insert into public.community_members (community_id, user_id, role)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'owner')$q$, 'cannot self-join as owner');

-- Carol (admin) aprova
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.community_verifications set status = 'approved', review_notes = 'Documentos conferidos'
where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select status from public.communities where id = '10000000-0000-0000-0000-000000000001') = 'verified', 'approval verifies community';
  assert (select count(*) from public.audit_log where action = 'community.verification_approved') = 1, 'approval audited';
end $$;
select pg_temp.expect_error($q$update public.community_verifications set status = 'rejected' where id = '20000000-0000-0000-0000-000000000001'$q$, 'cannot re-review');

-- Bob publica oportunidade
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.notifications where kind = 'community.verification_approved') = 1, 'owner notified';
end $$;
insert into public.opportunities (id, community_id, created_by, title, description, mode, status, country_code, city, languages, availability)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
        'Músicos para a missa', 'Precisamos de músicos para as missas de domingo à noite.', 'onsite', 'open', 'BR', 'Campinas', '{pt}', '{weekends}');
insert into public.opportunity_skills (opportunity_id, skill_id)
  select '30000000-0000-0000-0000-000000000001', id from public.skills where slug in ('guitar', 'keyboard');

-- ===== Anônimo =================================================================
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  assert (select count(*) from public.communities) = 1, 'anon sees verified community';
  assert (select count(*) from public.opportunities) = 1, 'anon sees open opportunity';
  assert (select count(*) from public.profiles) = 1, 'anon sees only public profiles';
  assert (select count(*) from public.profile_private) = 0, 'anon never sees private data';
  assert (select count(*) from public.applications) = 0, 'anon sees no applications';
  assert (select count(*) from public.search_volunteers()) = 1, 'anon search returns only public';
end $$;
select pg_temp.expect_error($q$insert into public.reports (reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-00000000000a', 'profile', '00000000-0000-0000-0000-00000000000b', 'spam')$q$, 'anon cannot write');
select pg_temp.expect_error($q$select public.start_conversation('00000000-0000-0000-0000-00000000000b')$q$, 'anon cannot start conversation');

-- ===== Candidatura e transições ================================================
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare r record; begin
  select * into r from public.match_opportunities_for_me() limit 1;
  assert r.opportunity_id = '30000000-0000-0000-0000-000000000001', 'match returns the opportunity';
  -- talentos 1/2 → 25; idioma pt → 20; mesma cidade → 20; fins de semana → 10 = 75
  assert r.score = 75, format('expected score 75, got %s', r.score);
end $$;
select pg_temp.expect_error($q$select * from public.match_volunteers_for_opportunity('30000000-0000-0000-0000-000000000001')$q$, 'volunteer cannot list candidates');
insert into public.applications (id, opportunity_id, applicant_id, message, status)
values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Toco violão há 10 anos.', 'accepted');
do $$ begin
  assert (select status from public.applications where id = '40000000-0000-0000-0000-000000000001') = 'pending', 'status forced to pending';
end $$;
select pg_temp.expect_error($q$update public.applications set status = 'accepted' where id = '40000000-0000-0000-0000-000000000001'$q$, 'applicant cannot accept self');
select pg_temp.expect_error($q$insert into public.applications (opportunity_id, applicant_id) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a')$q$, 'duplicate application');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin assert (select count(*) from public.applications) = 0, 'outsider cannot see applications'; end $$;
update public.applications set status = 'rejected' where id = '40000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select status from public.applications where id = '40000000-0000-0000-0000-000000000001') = 'pending', 'outsider update had no effect';
  assert (select count(*) from public.notifications where kind = 'application.received') = 1, 'community admin notified';
  assert (select array_agg(profile_id) from public.match_volunteers_for_opportunity('30000000-0000-0000-0000-000000000001'))
    = array['00000000-0000-0000-0000-00000000000c']::uuid[],
    'volunteer matches exclude applicants (alice), private profiles (dave) and self (bob)';
end $$;
select pg_temp.expect_error($q$update public.applications set status = 'completed' where id = '40000000-0000-0000-0000-000000000001'$q$, 'cannot complete before accepting');
update public.applications set status = 'accepted' where id = '40000000-0000-0000-0000-000000000001';
update public.applications set status = 'completed' where id = '40000000-0000-0000-0000-000000000001';

-- ===== Avaliações ==============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.notifications where kind in ('application.accepted', 'application.completed')) = 2, 'applicant notified';
end $$;
select pg_temp.expect_error($q$insert into public.reviews (application_id, reviewer_id, reviewee_profile_id, rating) values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 5)$q$, 'cannot review self');
insert into public.reviews (application_id, reviewer_id, reviewee_community_id, rating, comment)
values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 5, 'Acolhida maravilhosa.');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.expect_error($q$insert into public.reviews (application_id, reviewer_id, reviewee_community_id, rating) values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000001', 1)$q$, 'outsider cannot review');

-- ===== Mensagens e bloqueios ===================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect_error($q$select public.start_conversation('00000000-0000-0000-0000-00000000000a')$q$, 'conversation with self');
create temp table t_conv as select public.start_conversation('00000000-0000-0000-0000-00000000000b') as id;
grant select on t_conv to authenticated;
insert into public.messages (conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-00000000000b', 'Olá! A paz.' from t_conv;
do $$ begin
  assert (select sender_id from public.messages limit 1) = '00000000-0000-0000-0000-00000000000a', 'sender forced to caller';
  assert public.start_conversation('00000000-0000-0000-0000-00000000000b') = (select id from t_conv), 'reuses 1:1 conversation';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin assert (select count(*) from public.messages) = 0, 'outsider cannot read messages'; end $$;
select pg_temp.expect_error($q$insert into public.messages (conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-00000000000d', 'spam' from t_conv$q$, 'outsider cannot post');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.notifications where kind = 'message.received') = 1, 'recipient notified';
end $$;
select public.mark_conversation_read((select id from t_conv));
do $$ begin
  assert (select count(*) from public.notifications where kind = 'message.received' and read_at is null) = 0, 'mark read clears notification';
end $$;
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect_error($q$insert into public.messages (conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-00000000000a', 'oi?' from t_conv$q$, 'blocked user cannot message');

-- notificações: só read_at muda
update public.notifications set payload = '{"hacked":true}', read_at = now();
do $$ begin
  assert (select count(*) from public.notifications where payload ? 'hacked') = 0, 'payload immutable';
end $$;

-- ===== Rate limit (denúncias: 10/hora) ========================================
do $$ begin
  for i in 1..10 loop
    insert into public.reports (reporter_id, target_type, target_id, reason)
    values ('00000000-0000-0000-0000-00000000000a', 'opportunity', gen_random_uuid(), 'spam');
  end loop;
end $$;
select pg_temp.expect_error($q$insert into public.reports (reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-00000000000a', 'opportunity', gen_random_uuid(), 'spam')$q$, '11th report rate limited');
update public.reports set status = 'dismissed'; -- sem efeito (RLS)
reset role;
do $$ begin
  assert (select count(*) from public.reports where status = 'dismissed') = 0, 'reporter cannot handle own reports';
end $$;

-- ===== Moderador resolve denúncia =============================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update public.reports set status = 'dismissed', reason = 'other'
where id = (select id from public.reports order by created_at limit 1);
reset role;
do $$ begin
  assert (select count(*) from public.reports where status = 'dismissed' and handled_by = '00000000-0000-0000-0000-00000000000c' and reason = 'spam') = 1,
    'moderator handles report; reason immutable';
  assert (select count(*) from public.audit_log where action = 'report.dismissed') = 1, 'report handling audited';
end $$;

select 'ALL DB TESTS PASSED' as result;
