-- Modalidade no match, busca por modalidade e disponibilidade de recursos (migration 0010).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@t'), ('00000000-0000-0000-0000-0000000000c2', 'c2@t');
update public.profiles set onboarded_at = now(), visibility = 'public', country_code = 'BR', city = 'Recife',
  languages = '{pt}', availability = '{flexible}', service_modes = '{remote}' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000c2';

do $$ begin
  -- presencial na mesma cidade, mas o voluntário só atende remoto → localização 0 (20 + 25 + 0 + 10)
  assert public.match_score('{1}', '{1,2}', '{pt}', '{pt}', 'BR', 'Recife', 'onsite', 'BR', 'Recife', '{flexible}', '{}', '{remote}') = 55, 'mode preference zeroes location';
  assert public.match_score('{1}', '{1,2}', '{pt}', '{pt}', 'BR', 'Recife', 'onsite', 'BR', 'Recife', '{flexible}', '{}', '{}') = 75, 'no preference keeps reference score';
  assert public.match_score('{1}', '{1,2}', '{pt}', '{pt}', 'PT', null, 'remote', null, null, '{flexible}', '{}', '{remote}') = 75, 'remote matches remote preference';
end $$;

insert into public.communities (id, slug, name, kind, country_code, city, created_by, status, focus_categories, needs)
values ('c0000000-0000-0000-0000-000000000001', 'com-recursos', 'Com Recursos', 'parish', 'BR', 'Recife',
        '00000000-0000-0000-0000-0000000000c2', 'verified', '{1,2}', 'Precisamos de fotógrafos para a festa do padroeiro.');
insert into public.resources (id, community_id, created_by, title, kind, country_code, city)
values ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'Câmera DSLR', 'camera', 'BR', 'Recife');
insert into public.resource_requests (id, resource_id, requester_id, message, starts_on, ends_on)
values ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1',
        'Para o retiro da juventude.', current_date + 3, current_date + 5);
update public.resource_requests set status = 'approved' where id = 'c2000000-0000-0000-0000-000000000001';

set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.search_volunteers(p_modes => '{remote}')) >= 1, 'search by mode finds remote volunteer';
  assert (select count(*) from public.search_volunteers(p_modes => '{onsite}') where id = '00000000-0000-0000-0000-0000000000c1') = 0, 'remote-only excluded from onsite search';
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false);
do $$ begin
  assert (select count(*) from public.resource_busy_ranges('c1000000-0000-0000-0000-000000000001')) = 1, 'busy range visible to members';
  assert (select needs from public.communities where id = 'c0000000-0000-0000-0000-000000000001') like 'Precisamos%', 'needs stored';
end $$;
reset role;
set role anon;
do $$ declare ok boolean := false; begin
  begin perform public.resource_busy_ranges('c1000000-0000-0000-0000-000000000001'); exception when others then ok := true; end;
  assert ok, 'anon cannot read busy ranges';
end $$;
select 'MODES/NEEDS/RESOURCES OK';
