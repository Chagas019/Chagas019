-- supabase-js usa INSERT ... RETURNING (.select()); a linha precisa ser visível ao autor
-- antes dos triggers AFTER (ex.: o criador ainda não é membro no momento da checagem).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eve@test.local', '{"display_name":"Eve","locale":"es","consent_version":"2026-11"}');
do $$ begin
  assert (select terms_accepted_at is not null and privacy_accepted_at is not null and preferred_locale = 'es'
          from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'), 'consent and locale stored from signup metadata';
end $$;
update public.profiles set onboarded_at = now() where id = '00000000-0000-0000-0000-0000000000e1';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into public.communities (slug, name, kind, country_code, city, created_by)
values ('comunidade-eve', 'Comunidade Eve', 'community', 'PT', 'Lisboa', '00000000-0000-0000-0000-0000000000e1')
returning id, status;
insert into public.community_verifications (community_id, requested_by, evidence)
select id, '00000000-0000-0000-0000-0000000000e1', 'Carta da diocese de Lisboa confirmando a comunidade.'
from public.communities where slug = 'comunidade-eve'
returning id, status;
insert into public.opportunities (community_id, created_by, title, description, mode)
select id, '00000000-0000-0000-0000-0000000000e1', 'Rascunho de oportunidade', 'Descrição suficientemente longa para validar.', 'remote'
from public.communities where slug = 'comunidade-eve'
returning id, status;
select 'INSERT RETURNING OK';
