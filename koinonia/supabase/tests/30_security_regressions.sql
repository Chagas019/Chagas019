-- Regressões dos achados da revisão de segurança (migration 0008).
create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'ok (expected error) %: %', p_label, sqlerrm; return; end;
  raise exception 'EXPECTED ERROR BUT SUCCEEDED: %', p_label;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@t'), ('00000000-0000-0000-0000-0000000000f2', 'admin@t'),
  ('00000000-0000-0000-0000-0000000000f3', 'sock@t'),  ('00000000-0000-0000-0000-0000000000f4', 'vol@t');
update public.profiles set onboarded_at = now() where id::text like '00000000-0000-0000-0000-0000000000f%';
-- comunidade criada pelo serviço (sem JWT) já verificada
insert into public.communities (id, slug, name, kind, country_code, city, created_by, status, verified_at)
values ('50000000-0000-0000-0000-000000000001', 'sec-test', 'Sec Test', 'parish', 'BR', 'Rio', '00000000-0000-0000-0000-0000000000f1', 'verified', now());
insert into public.community_members (community_id, user_id, role)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', 'admin');
insert into public.opportunities (id, community_id, created_by, title, description, mode, status)
values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1',
        'Oportunidade teste', 'Descrição suficientemente longa para validar.', 'remote', 'open');
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3');

do $$ begin
  assert (select status from public.communities where id = '50000000-0000-0000-0000-000000000001') = 'verified', 'service role may create verified community';
end $$;

set role authenticated;
-- Admin (não-owner) não toma a comunidade
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
select pg_temp.expect_error($q$insert into public.community_members (community_id, user_id, role) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3', 'owner')$q$, 'admin cannot add owner');
select pg_temp.expect_error($q$insert into public.community_members (community_id, user_id, role) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3', 'member')$q$, 'admin cannot add others without consent');
select pg_temp.expect_error($q$update public.community_members set role = 'member' where user_id = '00000000-0000-0000-0000-0000000000f1'$q$, 'admin cannot demote owner');
select pg_temp.expect_error($q$delete from public.community_members where user_id = '00000000-0000-0000-0000-0000000000f1'$q$, 'admin cannot remove owner');
select pg_temp.expect_error($q$insert into public.applications (opportunity_id, applicant_id) values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2')$q$, 'admin cannot apply to own community');

-- Bloqueios de terceiros não são revelados
do $$ begin
  assert public.is_blocked_between('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3') = false, 'third party cannot probe blocks';
end $$;

-- Voluntário: campos de decisão e consentimento não são forjáveis
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f4', false);
insert into public.applications (id, opportunity_id, applicant_id) values ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f4');
update public.applications set decided_by = '00000000-0000-0000-0000-0000000000f1', decided_at = '2020-01-01', completed_at = '2020-01-01'
where id = '70000000-0000-0000-0000-000000000001';
update public.profiles set terms_accepted_at = '2000-01-01', privacy_accepted_at = '2000-01-01', onboarded_at = '2000-01-01'
where id = '00000000-0000-0000-0000-0000000000f4';
insert into public.community_members (community_id, user_id, role) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f4', 'member');
reset role;
do $$ begin
  assert (select decided_by is null and decided_at is null and completed_at is null from public.applications where id = '70000000-0000-0000-0000-000000000001'), 'decision fields not forgeable';
  assert (select terms_accepted_at > now() - interval '1 minute' and onboarded_at > '2026-01-01' and terms_accepted_at > '2026-01-01' from public.profiles where id = '00000000-0000-0000-0000-0000000000f4'), 'consent not backdated; onboarded_at immutable';
  assert (select count(*) from public.community_members where user_id = '00000000-0000-0000-0000-0000000000f4') = 1, 'self join still works';
end $$;

-- Recurso: pedido aprovado não pode ser reescrito
insert into public.resources (id, community_id, created_by, title, kind, country_code, city)
values ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'Projetor', 'equipment', 'BR', 'Rio');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', false);
insert into public.resource_requests (id, resource_id, requester_id, message, starts_on, ends_on)
values ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3', 'Para o retiro de jovens.', '2026-12-01', '2026-12-02');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
update public.resource_requests set status = 'approved' where id = '90000000-0000-0000-0000-000000000001';
select pg_temp.expect_error($q$update public.resource_requests set message = 'Alterado pelo admin do recurso' where id = '90000000-0000-0000-0000-000000000001'$q$, 'resource admin cannot edit request');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', false);
select pg_temp.expect_error($q$update public.resource_requests set ends_on = '2026-12-31' where id = '90000000-0000-0000-0000-000000000001'$q$, 'approved request dates immutable');
update public.resource_requests set requester_community_id = '50000000-0000-0000-0000-000000000001', decided_by = '00000000-0000-0000-0000-0000000000f3'
where id = '90000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select requester_community_id is null and decided_by = '00000000-0000-0000-0000-0000000000f2'
          from public.resource_requests where id = '90000000-0000-0000-0000-000000000001'), 'request decision fields immutable';
end $$;

-- Verificação: notas não pré-preenchíveis; rejeição de novo pedido não "desverifica"
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
insert into public.community_verifications (id, community_id, requested_by, evidence, review_notes)
values ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1',
        'Atualização de documentos da paróquia para revisão.', 'Aprovado pelo admin');
reset role;
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000f2', 'admin');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
update public.community_verifications set status = 'rejected' where id = 'a0000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select review_notes is null from public.community_verifications where id = 'a0000000-0000-0000-0000-000000000001'), 'notes cleared on insert';
  assert (select status from public.communities where id = '50000000-0000-0000-0000-000000000001') = 'verified', 'rejecting a re-verification keeps verified status';
  assert not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('crypt', 'similarity', 'gen_salt')), 'extension functions not exposed in public';
end $$;
select 'SECURITY REGRESSIONS OK';
