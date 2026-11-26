-- Testes de RLS: falham (ON_ERROR_STOP) se alguma regra de isolamento quebrar.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@teste.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'b@teste.invalid');

do $$ begin assert (select count(*) from public.profiles) = 2, 'trigger de perfil'; end $$;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.notes (title, body) values ('nota A', 'x');
insert into public.saved_items (kind, ref_id, title) values ('song', 'abraco-de-pai', 'Abraço')
  on conflict (user_id, kind, ref_id) do update set title = excluded.title;
insert into public.sermon_projects (title) values ('Projeto A');
insert into public.folders (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Pasta A');
do $$ begin
  perform public.consume_ai_credit(100);
  perform public.refund_ai_credit();
  assert (select count from public.ai_usage) = 0, 'refund_ai_credit';
end $$;
do $$ begin
  assert public.consume_ai_credit(2) = 1, 'crédito 1';
  assert public.consume_ai_credit(2) = 2, 'crédito 2';
  assert public.consume_ai_credit(2) = -1, 'limite do plano gratuito';
end $$;

-- não pode inserir em nome de outro usuário
do $$ begin
  begin
    insert into public.notes (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'invasão');
    raise exception 'RLS falhou: inseriu nota de outro usuário';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set plan = 'premium' where id = auth.uid();
    raise exception 'usuário alterou o próprio plano';
  exception when insufficient_privilege then null;
  end;
end $$;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  assert (select count(*) from public.notes) = 0, 'B vê notas de A';
  assert (select count(*) from public.saved_items) = 0, 'B vê salvos de A';
  assert (select count(*) from public.sermon_projects) = 0, 'B vê projetos de A';
  assert (select count(*) from public.profiles) = 1, 'B vê outros perfis';
  assert (select count(*) from public.ai_usage) = 0, 'B vê uso de A';
end $$;
update public.notes set title = 'hack';
do $$ begin
  begin
    insert into public.notes (title, folder_id) values ('na pasta alheia', 'aaaaaaaa-0000-0000-0000-000000000001');
    raise exception 'usou pasta de outro usuário';
  exception when foreign_key_violation then null;
  end;
end $$;

set role anon;
reset request.jwt.claim.sub;
do $$ begin
  assert (select count(*) from public.notes) = 0, 'anônimo vê notas';
  assert (select count(*) from public.songs) > 0, 'catálogo público';
end $$;

reset role;
do $$ begin assert (select title from public.notes limit 1) = 'nota A', 'B alterou nota de A'; end $$;
select 'RLS ok' as resultado;
