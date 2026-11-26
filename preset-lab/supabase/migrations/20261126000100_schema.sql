-- PRESET LAB — esquema inicial
-- Tabelas, restrições, índices e gatilhos. As políticas RLS ficam em 20261126000200_rls.sql.

create extension if not exists pgcrypto;

-- ============================================================================
-- profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ============================================================================
-- categories
-- ============================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '',
  kind text not null default 'style' check (kind in ('style', 'subject')),
  cover_image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- products
-- ============================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  short_description text not null default '' check (char_length(short_description) <= 200),
  description text not null default '',
  price_cents int not null default 0 check (price_cents >= 0 and price_cents <= 10000000),
  currency text not null default 'BRL' check (currency = 'BRL'),
  product_type text not null default 'free' check (product_type in ('free', 'premium')),
  -- como um produto premium é liberado
  access_mode text not null default 'free'
    check (access_mode in ('free', 'purchase_or_subscription', 'purchase_only', 'subscription_only')),
  category_id uuid references public.categories (id) on delete set null,
  tags text[] not null default '{}',
  cover_image text,
  before_image text,
  after_image text,
  gallery text[] not null default '{}',
  palette text[] not null default '{}',
  formats text[] not null default '{}',
  compatibility text[] not null default '{}',
  install_instructions text not null default '',
  creator_name text not null default '',
  creator_handle text not null default '',
  creator_bio text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  featured boolean not null default false,
  downloads_count int not null default 0 check (downloads_count >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- coerência entre tipo, modo de acesso e preço
  constraint products_type_access_chk check (
    (product_type = 'free' and access_mode = 'free' and price_cents = 0)
    or (product_type = 'premium' and access_mode <> 'free')
  ),
  constraint products_purchasable_price_chk check (
    access_mode not in ('purchase_or_subscription', 'purchase_only') or price_cents > 0
  )
);
create index products_status_published_idx on public.products (status, published_at desc);
create index products_category_idx on public.products (category_id);
create index products_featured_idx on public.products (featured) where featured;
create index products_tags_idx on public.products using gin (tags);
create index products_downloads_idx on public.products (downloads_count desc);

-- ============================================================================
-- product_files — arquivos originais (bucket privado "preset-files")
-- ============================================================================
create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 200),
  storage_path text not null unique,
  -- 'cube' e '3dl' já previstos para LUTs
  format text not null check (format in ('dng', 'xmp', 'zip', 'cube', '3dl')),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index product_files_product_idx on public.product_files (product_id);

-- ============================================================================
-- collections
-- ============================================================================
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  cover_image text,
  -- coleção exclusiva do Premium Club
  is_premium boolean not null default false,
  -- preço do pacote (null = não vendida como pacote)
  price_cents int check (price_cents is null or price_cents > 0),
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product_idx on public.collection_products (product_id);

-- ============================================================================
-- favorites
-- ============================================================================
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index favorites_product_idx on public.favorites (product_id);

-- ============================================================================
-- purchases / purchase_items
-- ============================================================================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  kind text not null check (kind in ('product', 'collection', 'subscription')),
  total_cents int not null check (total_cents >= 0),
  currency text not null default 'BRL',
  provider text not null check (provider in ('mercadopago', 'dev')),
  provider_reference text,
  provider_payment_id text,
  -- true quando criado pelo checkout simulado de desenvolvimento
  is_simulated boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index purchases_user_idx on public.purchases (user_id, created_at desc);
create index purchases_status_idx on public.purchases (status);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  plan text,
  title text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  constraint purchase_items_target_chk check (num_nonnulls(product_id, collection_id, plan) >= 1)
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_product_idx on public.purchase_items (product_id);
create index purchase_items_collection_idx on public.purchase_items (collection_id);

-- ============================================================================
-- subscriptions
-- ============================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('premium_monthly', 'premium_yearly')),
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text not null check (provider in ('mercadopago', 'dev')),
  provider_subscription_id text,
  is_simulated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
create index subscriptions_user_idx on public.subscriptions (user_id, status);

-- ============================================================================
-- downloads
-- ============================================================================
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  file_id uuid references public.product_files (id) on delete set null,
  created_at timestamptz not null default now()
);
create index downloads_user_idx on public.downloads (user_id, created_at desc);
create index downloads_product_idx on public.downloads (product_id);

-- ============================================================================
-- inspiration_posts
-- ============================================================================
create table public.inspiration_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  style_name text not null default '',
  image_url text not null,
  palette text[] not null default '{}',
  description text not null default '',
  product_ids uuid[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- banners (destaques da home)
-- ============================================================================
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image_url text,
  link_url text not null default '/presets' check (link_url ~ '^/'),
  link_label text not null default 'Explorar',
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- payment_events — registro idempotente de notificações de pagamento
-- ============================================================================
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mercadopago', 'dev')),
  event_id text not null,
  event_type text not null default '',
  payload jsonb not null default '{}',
  processed_at timestamptz,
  result text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ============================================================================
-- rate_limits — limitação de requisições sensíveis (janela fixa)
-- ============================================================================
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);

-- ============================================================================
-- gatilhos
-- ============================================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger purchases_touch before update on public.purchases for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

-- published_at automático ao publicar
create or replace function public.products_set_published_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger products_published_at before insert or update on public.products
  for each row execute function public.products_set_published_at();

-- contador de downloads
create or replace function public.downloads_bump_counter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.products set downloads_count = downloads_count + 1 where id = new.product_id;
  return new;
end $$;
create trigger downloads_bump after insert on public.downloads for each row execute function public.downloads_bump_counter();

-- perfil criado junto com o usuário do Supabase Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
