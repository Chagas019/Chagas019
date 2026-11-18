-- Testes de isolamento e permissões (rodar com tests/run.sh). Cada falha aborta com mensagem.
\set ON_ERROR_STOP 1
create schema tests;
grant usage on schema tests to authenticated, anon;
-- Executa SQL e exige que dê erro OU afete 0 linhas.
create function tests.denied(q text, msg text) returns void language plpgsql as $$
declare n int;
begin
  begin execute q; get diagnostics n = row_count;
  exception when others then return; end;
  if n > 0 then raise exception 'FALHOU (deveria negar): %', msg; end if;
end $$;
create function tests.allowed(q text, msg text) returns void language plpgsql as $$
declare n int;
begin
  begin execute q; get diagnostics n = row_count;
  exception when others then raise exception 'FALHOU (deveria permitir): % — %', msg, sqlerrm; end;
  if n = 0 then raise exception 'FALHOU (0 linhas): %', msg; end if;
end $$;
create function tests.eq(got bigint, want bigint, msg text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FALHOU: % (esperado %, veio %)', msg, want, got; end if; end $$;
grant execute on all functions in schema tests to authenticated, anon;

-- Segunda paróquia, para testar isolamento
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000b1','admin.b@exemplo.invalid','{"full_name":"Bia Outra"}'),
 ('00000000-0000-0000-0000-0000000000b2','menor.semconsent@exemplo.invalid','{"full_name":"Gui Menor Sem Consentimento"}');
insert into public.parishes (id, name, slug) values ('10000000-0000-0000-0000-0000000000b0','Paróquia Exemplo B','exemplo-b');
insert into public.memberships (parish_id, user_id, role) values
 ('10000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-0000000000b1','parish_admin'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','volunteer');
update public.profiles set birth_date = current_date - interval '12 years' where user_id = '00000000-0000-0000-0000-0000000000b2';
insert into public.events (parish_id, type, title, starts_at) values ('10000000-0000-0000-0000-0000000000b0','mass','Missa B', now());

-- ===== anon não vê nada
set role anon;
select tests.denied('select * from public.events', 'anon lê events');
reset role;

-- ===== Admin da paróquia B: isolamento
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select tests.eq((select count(*) from public.events), 1, 'B vê só o próprio evento');
select tests.eq((select count(*) from public.pastorals), 0, 'B não vê pastorais de A');
select tests.eq((select count(*) from public.memberships where parish_id='10000000-0000-0000-0000-000000000001'), 0, 'B não vê membros de A');
select tests.eq((select count(*) from public.profiles where user_id='00000000-0000-0000-0000-000000000004'), 0, 'B não vê perfis de A');
select tests.eq((select count(*) from public.parish_directory('10000000-0000-0000-0000-000000000001')), 0, 'B não lê diretório de A');
select tests.denied($$insert into public.events (parish_id,type,title,starts_at,created_by) values ('10000000-0000-0000-0000-000000000001','mass','Invasão',now(),auth.uid())$$, 'B cria evento em A');
select tests.denied($$insert into public.memberships (parish_id,user_id,role) values ('10000000-0000-0000-0000-000000000001',auth.uid(),'parish_admin')$$, 'B se coloca como admin de A');
select tests.denied($$update public.events set title='x' where parish_id='10000000-0000-0000-0000-000000000001'$$, 'B altera evento de A');
select tests.eq((select count(*) from public.audit_log where parish_id='10000000-0000-0000-0000-000000000001'), 0, 'B não lê auditoria de A');

-- ===== Voluntário (Davi, leitor)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select tests.eq((select count(*) from public.events), 2, 'voluntário vê eventos da própria paróquia');
select tests.eq((select count(*) from public.announcements), 1, 'voluntário vê só comunicado para todos');
select tests.eq((select count(*) from public.audit_log), 0, 'voluntário não lê auditoria');
select tests.eq((select count(*) from public.profiles where user_id='00000000-0000-0000-0000-000000000005'), 0, 'voluntário não vê perfil de menor');
select tests.eq((select count(*) from public.parish_directory('10000000-0000-0000-0000-000000000001') where display_name='Enzo'), 1, 'menor aparece só com primeiro nome');
select tests.eq((select count(*) from public.availability), 1, 'voluntário vê só a própria disponibilidade');
select tests.denied($$insert into public.events (parish_id,type,title,starts_at,created_by) values ('10000000-0000-0000-0000-000000000001','mass','X',now(),auth.uid())$$, 'voluntário cria evento');
select tests.denied($$update public.memberships set role='parish_admin' where user_id=auth.uid()$$, 'voluntário se promove');
select tests.allowed($$update public.roster_assignments set status='confirmed' where user_id=auth.uid()$$, 'voluntário confirma presença');
select tests.denied($$update public.roster_assignments set status='confirmed' where user_id='00000000-0000-0000-0000-000000000005'$$, 'voluntário confirma por outro');
select tests.denied($$update public.roster_assignments set user_id='00000000-0000-0000-0000-000000000006' where user_id=auth.uid()$$, 'voluntário repassa escala sozinho');
select tests.allowed($$update public.roster_assignments set status='swap_requested', swap_note='viagem' where user_id=auth.uid()$$, 'voluntário pede substituição');
select tests.denied($$insert into public.audit_log (action,entity) values ('x','y')$$, 'voluntário escreve na auditoria');
select tests.denied($$insert into public.help_offers (parish_id,help_request_id,user_id) select parish_id,id,'00000000-0000-0000-0000-000000000006' from public.help_requests$$, 'oferecer ajuda em nome de outro');

-- ===== Voluntária PASCOM (Fernanda)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
select tests.eq((select count(*) from public.profiles where user_id='00000000-0000-0000-0000-000000000004'), 0, 'voluntária não vê perfil de outro voluntário');
select tests.allowed($$insert into public.help_offers (parish_id,help_request_id,user_id) select parish_id,id,auth.uid() from public.help_requests$$, 'voluntária se oferece para ajudar');
select tests.allowed($$update public.help_offers set status='withdrawn' where user_id=auth.uid()$$, 'voluntária retira oferta');
select tests.denied($$update public.help_offers set status='accepted' where user_id=auth.uid()$$, 'voluntária se aceita sozinha');
select tests.allowed($$update public.help_offers set status='offered' where user_id=auth.uid()$$, 'voluntária refaz a oferta');
select tests.allowed($$insert into public.volunteer_skills (parish_id,user_id,skill_id) values ('10000000-0000-0000-0000-000000000001',auth.uid(),'30000000-0000-0000-0000-000000000001')$$, 'voluntária marca um talento');
select tests.allowed($$delete from public.volunteer_skills where user_id=auth.uid() and skill_id='30000000-0000-0000-0000-000000000001'$$, 'voluntária desmarca talento');
select tests.denied($$insert into public.volunteer_skills (parish_id,user_id,skill_id) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002')$$, 'voluntária marca talento de outro');
select tests.allowed($$insert into public.availability (parish_id,user_id,weekday,start_time,end_time) values ('10000000-0000-0000-0000-000000000001',auth.uid(),6,'08:00','12:00')$$, 'voluntária informa disponibilidade');
select tests.denied($$insert into public.skills (parish_id,name) values ('10000000-0000-0000-0000-000000000001','Hackear')$$, 'voluntária cria talento no catálogo');

-- ===== Coordenadora da Liturgia (Carla)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select tests.eq((select count(*) from public.announcements), 2, 'coordenadora vê comunicado de coordenadores');
select tests.eq((select count(*) from public.profiles where user_id='00000000-0000-0000-0000-000000000005'), 1, 'coordenadora vê perfil do coroinha da pastoral');
select tests.eq((select count(*) from public.profiles where user_id='00000000-0000-0000-0000-0000000000b2'), 0, 'coordenadora não vê menor de fora da pastoral');
select tests.allowed($$insert into public.roster_assignments (parish_id,slot_id,user_id,assigned_by) values ('10000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006',auth.uid())$$, 'coordenadora escala voluntário');
select tests.allowed($$update public.roster_assignments set status='pending' where user_id='00000000-0000-0000-0000-000000000004'$$, 'coordenadora reabre resposta');
select tests.denied($$insert into public.roster_assignments (parish_id,slot_id,user_id) values ('10000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b2')$$, 'menor sem consentimento em escala');
select tests.allowed($$insert into public.events (parish_id,pastoral_id,type,title,starts_at,created_by) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','meeting','Reunião Liturgia',now(),auth.uid())$$, 'coordenadora cria evento da própria pastoral');
select tests.denied($$insert into public.events (parish_id,pastoral_id,type,title,starts_at,created_by) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','meeting','X',now(),auth.uid())$$, 'coordenadora cria evento de outra pastoral');
select tests.denied($$insert into public.events (parish_id,type,title,starts_at,created_by) values ('10000000-0000-0000-0000-000000000001','mass','Sem pastoral',now(),auth.uid())$$, 'coordenadora cria evento geral');
select tests.denied($$insert into public.memberships (parish_id,user_id,role) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','volunteer')$$, 'coordenadora adiciona membro');

-- ===== Admin da paróquia A (Ana)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select tests.allowed($$update public.memberships set role='coordinator' where user_id='00000000-0000-0000-0000-000000000006'$$, 'admin muda papel de membro');
select tests.denied($$update public.memberships set role='volunteer' where user_id=auth.uid()$$, 'admin muda o próprio papel');
select tests.denied($$insert into public.roster_slots (parish_id,event_id,roster_role_id) values ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001')$$, 'função duplicada no mesmo evento');
select tests.eq((select count(*) from public.events), 3, 'admin vê eventos da paróquia');
select tests.eq((select (count(*) > 0)::int from public.audit_log where entity='roster_assignments' and actor_id is not null), 1, 'auditoria registrou ações');
reset role;

-- ===== Integridade entre paróquias (mesmo como superusuário)
select tests.denied($$insert into public.roster_slots (parish_id,event_id,roster_role_id) values ('10000000-0000-0000-0000-0000000000b0','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001')$$, 'slot de B apontando para evento de A');


-- ===== Onboarding: criar paróquia e convites
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000006","email":"fotografa@exemplo.invalid"}',false);
select tests.eq((select count(*) from (select public.create_parish('Paróquia Nova Exemplo','nova-exemplo')) x), 1, 'voluntária cria a própria paróquia');
select tests.eq((select count(*) from public.memberships m join public.parishes p on p.id=m.parish_id where p.slug='nova-exemplo' and m.role='parish_admin'), 1, 'quem cria vira admin');
select tests.denied($$select public.create_parish('Exemplo X','exemplo-a1')$$ || '; select public.create_parish(''Exemplo Y'',''exemplo-a2''); select public.create_parish(''Exemplo Z'',''exemplo-a3'')', 'mais de 3 paróquias por pessoa');
select tests.allowed($$insert into public.invitations (parish_id,email,role,invited_by) select id,'convidado@exemplo.invalid','coordinator',auth.uid() from public.parishes where slug='nova-exemplo'$$, 'admin convida');
select tests.denied($$insert into public.invitations (parish_id,email,invited_by) values ('10000000-0000-0000-0000-000000000001','x@exemplo.invalid',auth.uid())$$, 'voluntária convida na paróquia A');
-- convidado errado não aceita; convidado certo aceita uma vez
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000004","email":"leitor@exemplo.invalid"}',false);
select tests.denied($$select public.accept_invitation((select token from public.invitations limit 1))$$, 'convite usado por outro e-mail (token não visível)');
reset role;
create temp table tok as select token from public.invitations where email='convidado@exemplo.invalid';
grant select on tok to authenticated;
set role authenticated;
select tests.denied($$select public.accept_invitation((select token from tok))$$, 'convite aceito por outro e-mail');
reset role;
insert into auth.users (id,email) values ('00000000-0000-0000-0000-0000000000c1','convidado@exemplo.invalid');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c1","email":"Convidado@Exemplo.invalid"}',false);
select tests.eq((select count(*) from (select public.accept_invitation((select token from tok))) x), 1, 'convidado aceita');
select tests.eq((select count(*) from public.memberships where user_id=auth.uid() and role='coordinator'), 1, 'convidado entra com o papel do convite');
select tests.denied($$select public.accept_invitation((select token from tok))$$, 'convite reutilizado');
select tests.denied($$update public.memberships set role='parish_admin' where user_id=auth.uid()$$, 'convidado se promove');
reset role;

-- ===== Cadastro com senha (sign_up)
set role anon;
select set_config('request.jwt.claims','',false);
select tests.allowed($$select 1 from (select public.sign_up('nova.pessoa@exemplo.invalid','senha-segura-1','Nova Pessoa')) x$$, 'visitante cria conta com senha');
select tests.denied($$select public.sign_up('nova.pessoa@exemplo.invalid','outra-senha-2','Intrusa')$$, 'não cria conta com e-mail já usado');
select tests.denied($$select public.sign_up('leitor@exemplo.invalid','tomei-a-conta','Intruso')$$, 'não toma conta de quem já participa de paróquia');
select tests.denied($$select public.sign_up('curta@exemplo.invalid','123','X Y')$$, 'senha curta recusada');
select tests.denied($$select * from auth.users$$, 'visitante não lê usuários');
reset role;
select tests.eq((select count(*) from auth.users where email='nova.pessoa@exemplo.invalid' and email_confirmed_at is not null and encrypted_password = extensions.crypt('senha-segura-1', encrypted_password)), 1, 'senha gravada com hash e conta confirmada');
select tests.eq((select count(*) from public.profiles p join auth.users u on u.id=p.user_id where u.email='nova.pessoa@exemplo.invalid' and p.full_name='Nova Pessoa'), 1, 'perfil criado com o nome');
\echo 'TODOS OS TESTES PASSARAM'
