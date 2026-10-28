\set ON_ERROR_STOP 1
create or replace function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ESPERAVA ERRO "%" mas passou: %', needle, sql;
exception when others then
  if position(needle in sqlerrm) = 0 then raise exception 'erro errado para %: % (esperava %)', sql, sqlerrm, needle; end if;
end $$;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

set role authenticated;
-- 1. Ana cria a paróquia
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select create_parish('Paróquia São José','SP','PASCOM SJ','Ana','[{"id":"foto","name":"Fotografia","color":"#5BFF9A","icon":"Camera","description":"","compatibleWith":[]}]'::jsonb) is not null as criou;
select pg_temp.expect_error($q$select create_parish('Outra','','','Ana','[]')$q$, 'already_member');
select access = 'admin' as ana_admin from profiles where id = auth.uid();
select get_invite_code() as codigo \gset
select my_parish() as p1 \gset

-- 2. Beto entra com o código
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect_error($q$select join_parish('ERRADO00','Beto')$q$, 'invalid_code');
select join_parish(:'codigo', 'Beto') is not null as beto_entrou;
-- 3/4/5. Integrante não salva, não escreve direto e não vê o código
select pg_temp.expect_error($q$select save_parish_data('{"members":[],"schedules":[],"roles":[]}', 1)$q$, 'forbidden');
select pg_temp.expect_error($q$update parish_data set data = '{}'$q$, 'permission denied');
select pg_temp.expect_error($q$select invite_code from parishes$q$, 'permission denied');
select pg_temp.expect_error($q$select get_invite_code()$q$, 'forbidden');
select count(*) = 1 as beto_le_paroquia from parishes;

-- 6. Ana promove Beto a coordenador
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select data as d, version as v from parish_data \gset
select save_parish_data(jsonb_set(:'d'::jsonb, '{members}', (select jsonb_agg(case when m->>'name'='Beto' then m || '{"access":"coordenador"}' else m end) from jsonb_array_elements((:'d'::jsonb)->'members') m)), :v) as v2;
select access = 'coordenador' as beto_coordenador from profiles where full_name = 'Beto';

-- 7. Carla entra; Beto (coordenador) tenta torná-la admin e renomear a paróquia
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select join_parish(:'codigo', 'Carla') is not null as carla_entrou;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select data as d, version as v from parish_data \gset
select save_parish_data(jsonb_set(jsonb_set(:'d'::jsonb, '{parish,name}', '"Hackeada"'), '{members}', (select jsonb_agg(case when m->>'name'='Carla' then m || '{"access":"admin","email":"vaza@x.org"}' else m end) from jsonb_array_elements((:'d'::jsonb)->'members') m)), :v) > 0 as salvou;
select (select m->>'access' from parish_data, jsonb_array_elements(data->'members') m where m->>'name'='Carla') = 'integrante' as carla_continua_integrante;
select data #>> '{parish,name}' = 'Paróquia São José' as nome_preservado from parish_data;
select (select count(*) from parish_data, jsonb_array_elements(data->'members') m where m->>'email' <> '') = 0 as sem_email_no_json;
select (select access from profiles where full_name='Carla') = 'integrante' as perfil_carla_ok;

-- 8. Conflito de versão
select pg_temp.expect_error(format($q$select save_parish_data(%L::jsonb, %s)$q$, :'d', :v), 'version_conflict');

-- 9. Escala com vagas para Carla e Beto; Carla confirma a sua e tenta a do Beto
select data as d, version as v from parish_data \gset
select save_parish_data(jsonb_set(:'d'::jsonb, '{schedules}', jsonb_build_array(jsonb_build_object('id','e1','title','Missa','slots', jsonb_build_array(
  jsonb_build_object('id','s1','roleId','foto','memberId',(select member_id from profiles where full_name='Carla'),'status','pendente'),
  jsonb_build_object('id','s2','roleId','foto','memberId',(select member_id from profiles where full_name='Beto'),'status','pendente'))))), :v) > 0 as escala_criada;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select respond_assignment('e1','s1','confirmado','Chego cedo') > 0 as carla_confirmou;
select pg_temp.expect_error($q$select respond_assignment('e1','s2','recusado')$q$, 'not_your_slot');
select pg_temp.expect_error($q$select respond_assignment('e1','s1','pendente')$q$, 'invalid_status');
select data #>> '{schedules,0,slots,0,status}' = 'confirmado' as status_gravado, data #>> '{notifications,0,kind}' = 'confirmacao' as notificou from parish_data;
select update_my_availability('{"weekdays":[0],"periods":["noite"],"unavailableDates":["2026-12-25"]}') > 0 as disponibilidade;

-- 11. Contatos: Carla só vê o seu; Beto (staff) vê todos
select count(*) = 1 as carla_ve_1_contato from member_contacts;
with u as (update member_contacts set phone = '1' where email = 'ana@x.org' returning 1) select count(*) = 0 as carla_nao_altera_contato_alheio from u;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select count(*) = 3 as beto_ve_todos_contatos from member_contacts;

-- 13. Último admin não pode se rebaixar
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select data as d, version as v from parish_data \gset
select pg_temp.expect_error(format($q$select save_parish_data(%L::jsonb, %s)$q$, jsonb_set(:'d'::jsonb, '{members}', (select jsonb_agg(m || '{"access":"integrante"}') from jsonb_array_elements((:'d'::jsonb)->'members') m)), :v), 'last_admin');
select pg_temp.expect_error(format($q$select save_parish_data(%L::jsonb, %s)$q$, jsonb_set(:'d'::jsonb, '{members}', (select jsonb_agg(m) from jsonb_array_elements((:'d'::jsonb)->'members') m where m->>'name' <> 'Carla')), :v), 'member_with_account_removed');

-- 16. Cadastro prévio por e-mail é vinculado quando a pessoa entra
select save_parish_data(jsonb_set(:'d'::jsonb, '{members}', ((:'d'::jsonb)->'members') || '[{"id":"m_pre","name":"Elisa (cadastro)","roleIds":["foto"],"availability":{"weekdays":[0],"periods":["noite"],"unavailableDates":[]},"email":"","phone":"","status":"ativo","access":"integrante","joinedAt":"2026-01-01"}]'::jsonb), :v) > 0 as cadastrou_elisa;
insert into member_contacts (parish_id, member_id, email) values (my_parish(), 'm_pre', 'ELISA@x.org');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e5');
select join_parish(lower(:'codigo'), 'Elisa') is not null as elisa_entrou;
select member_id = 'm_pre' as vinculou_cadastro from profiles where id = auth.uid();
select (select count(*) from parish_data, jsonb_array_elements(data->'members') m where m->>'id' like 'm_%' and m->>'name' like 'Elisa%') = 1 as sem_duplicar;

-- 10. Outra paróquia não enxerga nada da primeira
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select count(*) = 0 as sem_perfil_nao_le from parish_data;
select create_parish('Paróquia Santa Rita','RJ','','Davi','[]') is not null as davi_criou;
select count(*) = 1 as so_a_propria_paroquia from parish_data;
select data #>> '{parish,name}' = 'Paróquia Santa Rita' as dados_isolados from parish_data;
select count(*) = 1 as so_o_proprio_contato from member_contacts;
with u as (update member_contacts set phone = '9' where member_id = 'm_pre' returning 1) select count(*) = 0 as nao_altera_outra_paroquia from u;
select pg_temp.expect_error(format($q$insert into member_contacts (parish_id, member_id, email) values (%L, 'x', 'a@b.co')$q$, :'p1'), 'row-level security');

-- 14. Progresso da formação: só o próprio
insert into training_progress (user_id, done) values (auth.uid(), '{celular/aparelhos}');
select pg_temp.expect_error($q$insert into training_progress (user_id, done) values ('00000000-0000-0000-0000-0000000000a1', '{x}')$q$, 'row-level security');
select count(*) = 1 as ve_so_o_seu from training_progress;

-- anon não faz nada
reset role; set role anon;
select pg_temp.expect_error($q$select public.create_parish('X paroquia','','','Fulano','[]')$q$, 'permission denied');
select count(*) = 0 as anon_nao_le from parish_data;
\echo TODOS_OS_TESTES_PASSARAM
