-- Testes de isolamento entre usuários (RLS). Falha com exceção se alguma regra for violada.
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"full_name":"Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'beto@example.com', '{}');

-- perfil + preferências (criados pelo servidor na primeira visita)
insert into public.mailbot_profiles (id, display_name) values ('11111111-1111-1111-1111-111111111111', 'Ana'), ('22222222-2222-2222-2222-222222222222', 'beto');
insert into public.mailbot_user_preferences (user_id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

insert into public.mailbot_gmail_accounts (id, user_id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ana@gmail.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'beto@gmail.com');
insert into public.mailbot_gmail_tokens (account_id, user_id, refresh_token_enc, scope) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'v1:enc', 'gmail.readonly');
insert into public.mailbot_emails (id, user_id, account_id, gmail_id, thread_id, from_email, subject, body_text, received_at, content_hash) values
  ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'g1', 't1', 'chefe@empresa.com', 'Relatório trimestral', 'Preciso do relatório até sexta', now(), 'h1'),
  ('eeeeeeee-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002', 'g1', 't1', 'banco@banco.com', 'Fatura do cartão', 'Sua fatura vence amanhã', now(), 'h2');
insert into public.mailbot_email_summaries (email_id, user_id, category, priority, relevance_score, summary, source) values
  ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'trabalho', 'importante', 80, 'Pedido de relatório', 'ai');

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  if (select count(*) from public.mailbot_emails) <> 1 then raise exception 'Ana vê e-mails de outro usuário'; end if;
  if (select count(*) from public.mailbot_gmail_accounts) <> 1 then raise exception 'Ana vê contas de outro usuário'; end if;
  if (select count(*) from public.mailbot_email_summaries) <> 1 then raise exception 'summaries vazando'; end if;
  if (select count(*) from public.mailbot_emails where search @@ websearch_to_tsquery('portuguese', 'relatório')) <> 1 then raise exception 'busca textual falhou'; end if;
  if (select count(*) from public.mailbot_emails where search @@ websearch_to_tsquery('portuguese', 'fatura')) <> 0 then raise exception 'busca vazou e-mail do Beto'; end if;
  if (select count(*) from public.mailbot_email_categories) <> 7 then raise exception 'categorias não legíveis'; end if;
end $$;

-- tokens: sem acesso algum
do $$ begin
  begin
    perform * from public.mailbot_gmail_tokens;
    raise exception 'authenticated conseguiu ler gmail_tokens';
  exception when insufficient_privilege then null;
  end;
end $$;

-- escrita direta bloqueada (sem policy de insert/update)
do $$ declare n int; begin
  update public.mailbot_emails set subject = 'hack' where true;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'update direto permitido'; end if;
  begin
    insert into public.mailbot_emails (user_id, account_id, gmail_id, thread_id, received_at, content_hash)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002', 'x', 'x', now(), 'x');
    raise exception 'insert direto permitido';
  exception when insufficient_privilege then null;
  end;
end $$;

-- rate limit não pode ser chamado pelo cliente
do $$ begin
  begin
    perform public.mailbot_rate_limit_hit('k', 1, 60);
    raise exception 'cliente executou rate_limit_hit';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Beto
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  if (select count(*) from public.mailbot_emails) <> 1 then raise exception 'Beto isolamento falhou'; end if;
  if (select count(*) from public.mailbot_email_summaries) <> 0 then raise exception 'Beto vê summary da Ana'; end if;
  if exists (select 1 from public.mailbot_emails where subject = 'hack') then raise exception 'update vazou'; end if;
end $$;

-- anon não vê nada
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.mailbot_emails) <> 0 then raise exception 'anon vê e-mails'; end if;
end $$;

-- rate limit (service role)
reset role;
do $$ begin
  if not public.mailbot_rate_limit_hit('t', 2, 60) then raise exception 'rl 1'; end if;
  if not public.mailbot_rate_limit_hit('t', 2, 60) then raise exception 'rl 2'; end if;
  if public.mailbot_rate_limit_hit('t', 2, 60) then raise exception 'rl 3 deveria bloquear'; end if;
end $$;

-- exclusão do usuário apaga tudo em cascata
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  if exists (select 1 from public.mailbot_emails where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'cascade falhou'; end if;
  if exists (select 1 from public.mailbot_gmail_tokens where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'tokens não apagados'; end if;
end $$;
select 'RLS OK: todos os testes de isolamento passaram' as resultado;

-- service_role (usado pelo backend) pode chamar o rate limit
set role service_role;
do $$ begin
  if not public.mailbot_rate_limit_hit('svc', 5, 60) then raise exception 'service_role sem acesso ao rate limit'; end if;
end $$;
reset role;
select 'service_role OK' as resultado;
