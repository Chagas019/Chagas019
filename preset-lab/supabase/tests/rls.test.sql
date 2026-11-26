-- Testes de RLS e regras de negócio (rodados por scripts/test-migrations.sh)
\set QUIET on
create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  perform set_config('request.jwt.claim.role', case when uid is null then 'anon' else 'authenticated' end, false);
end $$;

-- usuários de teste (gatilho cria os perfis)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

select pg_temp.assert((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ana', 'perfil criado pelo gatilho de auth.users');

-- rascunho para testar visibilidade
insert into public.products (slug, name, status, product_type, access_mode, price_cents) values ('rascunho-secreto', 'Rascunho', 'draft', 'premium', 'purchase_only', 1000);

-- ---------------------------------------------------------------- anon
set role anon;
select pg_temp.as_user(null);
select pg_temp.assert((select count(*) from public.products) = 12, 'anon vê só os 12 produtos publicados');
select pg_temp.assert((select count(*) from public.product_files) = 0, 'anon não lê metadados de arquivos');
select pg_temp.assert((select count(*) from public.profiles) = 0, 'anon não lê perfis');
select pg_temp.assert((select count(*) from public.categories) = 10, 'anon lê categorias');
do $$ begin
  insert into public.favorites (user_id, product_id) select '00000000-0000-0000-0000-00000000000a', id from public.products limit 1;
  raise exception 'FALHOU: anon inseriu favorito';
exception when insufficient_privilege then raise notice 'ok - anon não cria favoritos';
end $$;
reset role;

-- ---------------------------------------------------------------- usuário comum
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert((select count(*) from public.profiles) = 1, 'usuário lê só o próprio perfil');
insert into public.favorites (user_id, product_id) select '00000000-0000-0000-0000-00000000000a', id from public.products where slug = 'neon-noir';
select pg_temp.assert((select count(*) from public.favorites) = 1, 'usuário cria e lê o próprio favorito');
do $$ begin
  insert into public.favorites (user_id, product_id) select '00000000-0000-0000-0000-00000000000b', id from public.products where slug = 'neon-noir';
  raise exception 'FALHOU: favoritou em nome de outro usuário';
exception when insufficient_privilege then raise notice 'ok - não favorita em nome de outro';
end $$;
do $$ begin
  insert into public.purchases (user_id, kind, total_cents, provider, status) values ('00000000-0000-0000-0000-00000000000a', 'product', 0, 'dev', 'paid');
  raise exception 'FALHOU: usuário criou compra paga';
exception when insufficient_privilege then raise notice 'ok - usuário não cria compras diretamente';
end $$;
do $$ begin
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
  raise exception 'FALHOU: usuário virou admin';
exception when insufficient_privilege then raise notice 'ok - usuário não se promove a admin';
end $$;
update public.profiles set email = 'hack@example.com', display_name = 'Ana Lima' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.assert((select email from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'ana@example.com', 'e-mail do perfil não é alterado pelo usuário');
select pg_temp.assert(not exists (select 1 from public.products where slug = 'rascunho-secreto'), 'usuário não vê rascunho');
do $$ begin
  perform public.fulfill_purchase(gen_random_uuid(), 'x', 'x', 'dev', '{}');
  raise exception 'FALHOU: usuário executou fulfill_purchase';
exception when insufficient_privilege then raise notice 'ok - usuário não executa fulfill_purchase';
end $$;
do $$ begin
  perform public.admin_dashboard_stats();
  raise exception 'FALHOU: usuário leu estatísticas';
exception when insufficient_privilege then raise notice 'ok - usuário não lê estatísticas do admin';
end $$;
select pg_temp.assert(public.can_access_product('00000000-0000-0000-0000-00000000000a', (select id from public.products where slug = 'golden-dunes')), 'gratuito liberado para usuário logado');
select pg_temp.assert(not public.can_access_product('00000000-0000-0000-0000-00000000000a', (select id from public.products where slug = 'neon-noir')), 'premium bloqueado sem compra');
reset role;

-- ---------------------------------------------------------------- compra + idempotência (service role)
set role service_role;
select pg_temp.as_user(null);
select set_config('request.jwt.claim.role', 'service_role', false);
insert into public.purchases (id, user_id, kind, total_cents, provider, status) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'product', 2990, 'mercadopago', 'pending');
insert into public.purchase_items (purchase_id, product_id, title, unit_price_cents) select '11111111-1111-1111-1111-111111111111', id, name, price_cents from public.products where slug = 'neon-noir';
select pg_temp.assert(public.fulfill_purchase('11111111-1111-1111-1111-111111111111', 'pay-1', 'evt-1', 'mercadopago', '{}') = 'fulfilled', 'pagamento confirmado');
select pg_temp.assert(public.fulfill_purchase('11111111-1111-1111-1111-111111111111', 'pay-1', 'evt-1', 'mercadopago', '{}') = 'duplicate_event', 'evento repetido é ignorado (idempotência)');
select pg_temp.assert(public.fulfill_purchase('11111111-1111-1111-1111-111111111111', 'pay-1', 'evt-2', 'mercadopago', '{}') = 'already_paid', 'segundo evento não paga de novo');
-- coleção
insert into public.purchases (id, user_id, kind, total_cents, provider, status) values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000b', 'collection', 5990, 'mercadopago', 'pending');
insert into public.purchase_items (purchase_id, collection_id, title, unit_price_cents) select '22222222-2222-2222-2222-222222222222', id, title, price_cents from public.collections where slug = 'luz-dourada';
select public.fulfill_purchase('22222222-2222-2222-2222-222222222222', 'pay-2', 'evt-3', 'mercadopago', '{}');
-- assinatura
insert into public.purchases (id, user_id, kind, total_cents, provider, status) values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-00000000000b', 'subscription', 1990, 'mercadopago', 'pending');
insert into public.purchase_items (purchase_id, plan, title, unit_price_cents) values ('33333333-3333-3333-3333-333333333333', 'premium_monthly', 'Premium Club mensal', 1990);
select public.fulfill_purchase('33333333-3333-3333-3333-333333333333', 'pay-3', 'evt-4', 'mercadopago', '{}');
-- renovação soma ao período vigente
insert into public.purchases (id, user_id, kind, total_cents, provider, status) values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-00000000000b', 'subscription', 1990, 'mercadopago', 'pending');
insert into public.purchase_items (purchase_id, plan, title, unit_price_cents) values ('44444444-4444-4444-4444-444444444444', 'premium_monthly', 'Premium Club mensal', 1990);
select public.fulfill_purchase('44444444-4444-4444-4444-444444444444', 'pay-4', 'evt-5', 'mercadopago', '{}');
select pg_temp.assert((select max(current_period_end) from public.subscriptions where user_id = '00000000-0000-0000-0000-00000000000b') > now() + interval '55 days', 'renovação soma ao período atual');
reset role;

select pg_temp.assert(public.can_access_product('00000000-0000-0000-0000-00000000000a', (select id from public.products where slug = 'neon-noir')), 'premium liberado após compra');
select pg_temp.assert(not public.can_access_product('00000000-0000-0000-0000-00000000000a', (select id from public.products where slug = 'fog-ritual')), 'exclusivo de assinatura bloqueado para quem só comprou outro produto');
select pg_temp.assert(public.can_access_product('00000000-0000-0000-0000-00000000000b', (select id from public.products where slug = 'golden-vows')), 'produto liberado via coleção comprada');
select pg_temp.assert(public.can_access_product('00000000-0000-0000-0000-00000000000b', (select id from public.products where slug = 'fog-ritual')), 'assinatura ativa libera exclusivo do Club');
select pg_temp.assert(public.can_access_product('00000000-0000-0000-0000-00000000000b', (select id from public.products where slug = 'neon-noir')), 'assinatura libera purchase_or_subscription');
-- golden-vows é purchase_only: assinatura sozinha não libera
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'carla@example.com');
insert into public.subscriptions (user_id, plan, status, current_period_end, provider, provider_subscription_id) values ('00000000-0000-0000-0000-00000000000c', 'premium_monthly', 'active', now() + interval '10 days', 'dev', 'sub-c');
select pg_temp.assert(not public.can_access_product('00000000-0000-0000-0000-00000000000c', (select id from public.products where slug = 'golden-vows')), 'purchase_only não é liberado por assinatura');
update public.subscriptions set current_period_end = now() - interval '1 day' where provider_subscription_id = 'sub-c';
select pg_temp.assert(not public.can_access_product('00000000-0000-0000-0000-00000000000c', (select id from public.products where slug = 'fog-ritual')), 'assinatura vencida não libera');

-- leitura de compras alheias
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert((select count(*) from public.purchases) = 1, 'usuário vê só as próprias compras');
select pg_temp.assert((select count(*) from public.subscriptions) = 0, 'usuário não vê assinaturas alheias');
reset role;

-- downloads incrementam contador
insert into public.downloads (user_id, product_id) select '00000000-0000-0000-0000-00000000000a', id from public.products where slug = 'golden-dunes';
select pg_temp.assert((select downloads_count from public.products where slug = 'golden-dunes') = 1, 'download incrementa contador');

-- ---------------------------------------------------------------- admin
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.assert(exists (select 1 from public.products where slug = 'rascunho-secreto'), 'admin vê rascunhos');
select pg_temp.assert((select count(*) from public.product_files) = 24, 'admin lê arquivos');
select pg_temp.assert((public.admin_dashboard_stats() ->> 'paid_orders')::int = 4, 'estatísticas contam pedidos pagos');
update public.products set price_cents = 3490 where slug = 'neon-noir';
select pg_temp.assert((select price_cents from public.products where slug = 'neon-noir') = 3490, 'admin edita produto');
do $$ begin
  update public.profiles set role = 'user' where id = '00000000-0000-0000-0000-0000000000ad';
  raise exception 'FALHOU: admin removeu o próprio acesso';
exception when insufficient_privilege then raise notice 'ok - admin não remove o próprio acesso';
end $$;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.assert((select role from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'admin', 'admin promove outro usuário');
reset role;

-- restrições de integridade
do $$ begin
  insert into public.products (slug, name, product_type, access_mode, price_cents) values ('gratis-com-preco', 'X', 'free', 'free', 100);
  raise exception 'FALHOU: produto gratuito com preço';
exception when check_violation then raise notice 'ok - gratuito não pode ter preço';
end $$;
do $$ begin
  insert into public.products (slug, name, product_type, access_mode, price_cents) values ('premium-sem-preco', 'X', 'premium', 'purchase_only', 0);
  raise exception 'FALHOU: premium à venda sem preço';
exception when check_violation then raise notice 'ok - premium à venda precisa de preço';
end $$;
select pg_temp.assert(public.rate_limit_hit('t', 60, 2) and public.rate_limit_hit('t', 60, 2) and not public.rate_limit_hit('t', 60, 2), 'rate limit bloqueia a 3ª tentativa');
