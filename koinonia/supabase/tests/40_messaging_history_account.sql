-- Conversas, histórico e exclusão de conta (migration 0009).
create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'ok (expected error) %: %', p_label, sqlerrm; return; end;
  raise exception 'EXPECTED ERROR BUT SUCCEEDED: %', p_label;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'm1@t'), ('00000000-0000-0000-0000-0000000000a2', 'm2@t'),
  ('00000000-0000-0000-0000-0000000000a3', 'm3@t');
update public.profiles set onboarded_at = now(), display_name = 'Privada', visibility = 'private' where id = '00000000-0000-0000-0000-0000000000a2';
update public.profiles set onboarded_at = now(), display_name = 'Um', visibility = 'public' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set onboarded_at = now(), display_name = 'Tres' where id = '00000000-0000-0000-0000-0000000000a3';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
create temp table t_c as select public.start_conversation('00000000-0000-0000-0000-0000000000a2') as id;
grant select on t_c to authenticated;
insert into public.messages (conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-0000000000a1', 'Primeira' from t_c;
insert into public.messages (conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-0000000000a1', 'Segunda' from t_c;
do $$ declare r record; begin
  select * into r from public.my_conversations();
  assert r.other_name = 'Privada', 'participant sees name of private interlocutor';
  assert r.last_body = 'Segunda' and r.unread = 0, 'own messages are not unread';
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
do $$ begin
  assert public.unread_message_count() = 2, 'recipient has 2 unread';
end $$;
select public.mark_conversation_read((select id from t_c));
do $$ begin assert public.unread_message_count() = 0, 'mark read clears count'; end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', false);
do $$ begin assert (select count(*) from public.my_conversations()) = 0, 'outsider sees no conversations'; end $$;

-- histórico respeita visibilidade
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.communities (id, slug, name, kind, country_code, city, created_by, status)
values ('b0000000-0000-0000-0000-000000000001', 'hist-com', 'Hist', 'parish', 'BR', 'X', '00000000-0000-0000-0000-0000000000a3', 'verified');
insert into public.opportunities (id, community_id, created_by, title, description, mode, status)
values ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 'Coral da missa', 'Descrição suficientemente longa aqui.', 'remote', 'open');
insert into public.applications (opportunity_id, applicant_id) values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1'),
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2');
update public.applications set status = 'completed', completed_at = now() where opportunity_id = 'b1000000-0000-0000-0000-000000000001';
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.collaboration_history('00000000-0000-0000-0000-0000000000a1')) = 1, 'public history visible';
  assert (select count(*) from public.collaboration_history('00000000-0000-0000-0000-0000000000a2')) = 0, 'private history hidden';
end $$;

-- exclusão de conta
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', false);
select pg_temp.expect_error($q$select public.delete_my_account()$q$, 'sole owner cannot delete account');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000a1'), 'auth user removed';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'profile removed';
  assert not exists (select 1 from public.messages where sender_id = '00000000-0000-0000-0000-0000000000a1'), 'messages removed';
  assert exists (select 1 from public.audit_log where action = 'account.deleted'), 'deletion audited';
end $$;
select 'MESSAGING/HISTORY/ACCOUNT OK';
