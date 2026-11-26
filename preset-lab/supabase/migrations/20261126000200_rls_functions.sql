-- PRESET LAB — funções de acesso, RLS e storage

-- ============================================================================
-- Funções auxiliares (security definer, search_path fixo)
-- ============================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active', 'past_due')
      and current_period_end is not null and current_period_end > now()
  );
$$;

-- o usuário comprou o produto (avulso ou dentro de uma coleção paga)
create or replace function public.user_owns_product(uid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.purchases p
    join public.purchase_items i on i.purchase_id = p.id
    left join public.collection_products cp on cp.collection_id = i.collection_id
    where p.user_id = uid and p.status = 'paid'
      and (i.product_id = pid or cp.product_id = pid)
  );
$$;

-- decisão de acesso espelhada em src/lib/services/access.ts
create or replace function public.can_access_product(uid uuid, pid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  m text;
  st text;
begin
  if uid is null then return false; end if;
  -- um usuário comum só consulta o próprio acesso
  if coalesce(auth.role(), '') = 'authenticated' and uid is distinct from auth.uid() and not public.is_admin() then
    return false;
  end if;
  select access_mode, status into m, st from public.products where id = pid;
  if m is null then return false; end if;
  if exists (select 1 from public.profiles where id = uid and role = 'admin') then return true; end if;
  if st <> 'published' then return false; end if;
  if m = 'free' then return true; end if;
  if m in ('purchase_or_subscription', 'purchase_only') and public.user_owns_product(uid, pid) then return true; end if;
  if m in ('purchase_or_subscription', 'subscription_only') and public.has_active_subscription(uid) then return true; end if;
  return false;
end $$;

-- Confirma um pagamento de forma atômica e idempotente.
-- Só o service role executa (webhook validado no servidor).
create or replace function public.fulfill_purchase(
  p_purchase_id uuid,
  p_provider_payment_id text,
  p_event_id text,
  p_provider text,
  p_payload jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  pur public.purchases%rowtype;
  item record;
  inserted int;
  base_end timestamptz;
begin
  insert into public.payment_events (provider, event_id, event_type, payload)
  values (p_provider, p_event_id, 'payment.approved', coalesce(p_payload, '{}'))
  on conflict (provider, event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 'duplicate_event';
  end if;

  select * into pur from public.purchases where id = p_purchase_id for update;
  if not found then
    update public.payment_events set processed_at = now(), result = 'purchase_not_found'
      where provider = p_provider and event_id = p_event_id;
    return 'purchase_not_found';
  end if;
  if pur.status = 'paid' then
    update public.payment_events set processed_at = now(), result = 'already_paid'
      where provider = p_provider and event_id = p_event_id;
    return 'already_paid';
  end if;

  update public.purchases
     set status = 'paid', paid_at = now(), provider_payment_id = p_provider_payment_id
   where id = p_purchase_id;

  if pur.kind = 'subscription' then
    -- período pré-pago; renovar soma ao fim do período vigente
    select greatest(now(), coalesce(max(current_period_end), now())) into base_end
      from public.subscriptions
     where user_id = pur.user_id and status in ('active', 'past_due');
    for item in select plan from public.purchase_items where purchase_id = p_purchase_id and plan is not null loop
      insert into public.subscriptions (user_id, plan, status, current_period_end, provider, provider_subscription_id, is_simulated)
      values (
        pur.user_id, item.plan, 'active',
        base_end + case when item.plan = 'premium_yearly' then interval '1 year' else interval '1 month' end,
        pur.provider, 'purchase:' || pur.id::text, pur.is_simulated
      )
      on conflict (provider, provider_subscription_id) do update
        set status = 'active', current_period_end = excluded.current_period_end;
    end loop;
  end if;

  update public.payment_events set processed_at = now(), result = 'fulfilled'
    where provider = p_provider and event_id = p_event_id;
  return 'fulfilled';
end $$;

-- limitação de requisições (janela fixa); true = permitido
create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r public.rate_limits%rowtype;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1 else public.rate_limits.hits + 1 end,
    window_start = case when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now() else public.rate_limits.window_start end
  returning * into r;
  return r.hits <= p_max;
end $$;

-- métricas do Admin Studio (somente administradores)
create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'products', (select count(*) from public.products),
    'published_products', (select count(*) from public.products where status = 'published'),
    'downloads', (select count(*) from public.downloads),
    'paid_orders', (select count(*) from public.purchases where status = 'paid' and not is_simulated),
    'revenue_cents', (select coalesce(sum(total_cents), 0) from public.purchases where status = 'paid' and not is_simulated),
    'simulated_orders', (select count(*) from public.purchases where status = 'paid' and is_simulated),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active' and current_period_end > now())
  );
end $$;

-- impede que um usuário comum altere o próprio papel
-- (sem security definer: current_user precisa ser o papel de quem fez a requisição)
create or replace function public.profiles_guard_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'apenas administradores alteram papéis' using errcode = '42501';
  end if;
  -- e-mail é espelhado do Supabase Auth; só o servidor altera
  if new.email is distinct from old.email and current_user in ('anon', 'authenticated') then
    new.email := old.email;
  end if;
  if new.id = auth.uid() and new.role <> 'admin' and old.role = 'admin' then
    raise exception 'um administrador não pode remover o próprio acesso' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.profiles_guard_role();

revoke execute on function public.fulfill_purchase(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.user_owns_product(uuid, uuid) from public, anon;
revoke execute on function public.has_active_subscription(uuid) from public, anon;
revoke execute on function public.can_access_product(uuid, uuid) from public, anon;
grant execute on function public.fulfill_purchase(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
revoke execute on function public.user_owns_product(uuid, uuid) from authenticated;
revoke execute on function public.has_active_subscription(uuid) from authenticated;
grant execute on function public.user_owns_product(uuid, uuid) to service_role;
grant execute on function public.has_active_subscription(uuid) to service_role;
grant execute on function public.can_access_product(uuid, uuid) to authenticated, service_role;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.favorites enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.downloads enable row level security;
alter table public.inspiration_posts enable row level security;
alter table public.banners enable row level security;
alter table public.payment_events enable row level security;
alter table public.rate_limits enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- catálogo público
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- metadados de arquivos: apenas admin (o download passa pelo servidor)
create policy product_files_admin on public.product_files for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy collections_read on public.collections for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy collections_admin on public.collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy collection_products_read on public.collection_products for select to anon, authenticated using (true);
create policy collection_products_admin on public.collection_products for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- favoritos: cada um os seus
create policy favorites_own on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- compras/assinaturas/downloads: leitura própria ou admin; escrita só pelo servidor (service role)
create policy purchases_read on public.purchases for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy purchase_items_read on public.purchase_items for select to authenticated using (
  exists (select 1 from public.purchases p where p.id = purchase_id and (p.user_id = auth.uid() or public.is_admin()))
);
create policy subscriptions_read on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy downloads_read on public.downloads for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- conteúdo editorial
create policy inspiration_read on public.inspiration_posts for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy inspiration_admin on public.inspiration_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy banners_read on public.banners for select to anon, authenticated using (active or public.is_admin());
create policy banners_admin on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- eventos de pagamento: só leitura para admin
create policy payment_events_admin_read on public.payment_events for select to authenticated using (public.is_admin());
-- rate_limits: nenhuma política → inacessível para anon/authenticated

-- ============================================================================
-- Storage
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('preset-files', 'preset-files', false, 104857600)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- preset-files: nenhuma política para anon/authenticated. Só o service role (servidor) lê e grava,
-- e o usuário recebe uma URL assinada de curta duração depois da verificação de acesso.
create policy media_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy media_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
