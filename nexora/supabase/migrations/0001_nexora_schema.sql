-- NEXORA Real Estate — esquema, papéis e políticas de Row Level Security.
-- Aplicar com: supabase db push   (ou colar no SQL Editor do projeto)
-- Princípio: o frontend usa só a chave anon; toda proteção está aqui no banco.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- Perfis e papéis
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'cliente' check (role in ('cliente', 'corretor', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Funções auxiliares (security definer para não recursar nas políticas)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('corretor', 'admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Cria o perfil (papel "cliente") a cada novo usuário
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "perfil: dono lê o próprio" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "perfil: dono edita o nome" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
-- Mudança de papel só pela função de servidor admin-users (service role) ou por um admin:
create policy "perfil: admin gerencia" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- Imóveis
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 3 and 120),
  type text not null check (type in ('casa', 'apartamento', 'casa-condominio', 'studio', 'terreno', 'comercial', 'cobertura')),
  purpose text not null check (purpose in ('venda', 'aluguel')),
  price numeric(14, 2) not null check (price > 0),
  condo_fee numeric(12, 2) check (condo_fee >= 0),
  iptu numeric(12, 2) check (iptu >= 0),
  city text not null,
  neighborhood text not null,
  state text not null default '',
  -- localização aproximada: nunca o endereço exato
  approx_lat double precision,
  approx_lng double precision,
  approx_radius_m integer check (approx_radius_m between 200 and 5000),
  built_area numeric(10, 2) check (built_area > 0),
  land_area numeric(10, 2) check (land_area > 0),
  bedrooms smallint not null default 0 check (bedrooms >= 0),
  suites smallint not null default 0 check (suites >= 0 and suites <= bedrooms),
  bathrooms smallint not null default 0 check (bathrooms >= 0),
  parking smallint not null default 0 check (parking >= 0),
  headline text not null default '',
  description text not null default '',
  internal_features text[] not null default '{}',
  external_features text[] not null default '{}',
  tags text[] not null default '{}' check (tags <@ array['lancamento', 'exclusivo']),
  lifestyle text[] not null default '{}',
  featured boolean not null default false,
  status text not null default 'rascunho' check (status in ('publicado', 'rascunho', 'arquivado')),
  demo boolean not null default false,
  cover jsonb not null,
  gallery jsonb not null default '[]',
  video jsonb,
  floor_plan jsonb,
  model3d jsonb,
  panoramas jsonb,
  documents_authorized boolean not null default false,
  architect text,
  year_built smallint,
  seo jsonb,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_search_idx on public.properties (purpose, type, price);
alter table public.properties enable row level security;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();

create policy "imóveis: público vê publicados" on public.properties for select using (status = 'publicado' or public.is_staff());
create policy "imóveis: equipe cadastra" on public.properties for insert with check (public.is_staff());
create policy "imóveis: equipe edita" on public.properties for update using (public.is_staff()) with check (public.is_staff());
create policy "imóveis: só admin exclui" on public.properties for delete using (public.is_admin());

-- Documentos técnicos: tabela separada, visível ao público apenas quando o proprietário autorizou
create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  label text not null,
  value text not null,
  sort smallint not null default 0
);
alter table public.property_documents enable row level security;
create policy "documentos: público só autorizados" on public.property_documents for select using (
  public.is_staff() or exists (
    select 1 from public.properties p where p.id = property_id and p.status = 'publicado' and p.documents_authorized
  )
);
create policy "documentos: equipe gerencia" on public.property_documents for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- Contatos e visitas
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('informacoes', 'visita', 'contato')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 160),
  phone text check (char_length(phone) <= 30),
  message text check (char_length(message) <= 2000),
  property_id uuid references public.properties (id) on delete set null,
  property_name text,
  visit_at timestamptz,
  visit_mode text check (visit_mode in ('presencial', 'video')),
  source text not null default 'site' check (char_length(source) <= 60),
  status text not null default 'novo' check (status in ('novo', 'em-atendimento', 'visita-agendada', 'concluido', 'descartado')),
  consent boolean not null check (consent),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status, created_at desc);
alter table public.leads enable row level security;

-- Visitantes podem ENVIAR, nunca ler. Status inicial e notas internas são forçados.
create policy "contatos: qualquer um envia" on public.leads for insert to anon, authenticated
  with check (status = 'novo' and notes is null and consent);
create policy "contatos: equipe lê" on public.leads for select using (public.is_staff());
create policy "contatos: equipe atualiza" on public.leads for update using (public.is_staff()) with check (public.is_staff());
create policy "contatos: admin exclui" on public.leads for delete using (public.is_admin());

-- ---------------------------------------------------------------- Favoritos (usuários autenticados)
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  property_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
alter table public.favorites enable row level security;
create policy "favoritos: só os próprios" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- Conteúdo do site
create table if not exists public.site_content (
  key text primary key check (key in ('home', 'categories', 'contact', 'seo', 'legal')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) default auth.uid()
);
alter table public.site_content enable row level security;
create policy "conteúdo: leitura pública" on public.site_content for select using (true);
create policy "conteúdo: equipe edita" on public.site_content for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  text text not null check (char_length(text) <= 600),
  property_id uuid references public.properties (id) on delete set null,
  -- só aparece no site com autorização registrada do autor
  authorized boolean not null default false,
  authorized_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (not published or authorized)
);
alter table public.testimonials enable row level security;
create policy "depoimentos: público vê publicados" on public.testimonials for select using ((published and authorized) or public.is_staff());
create policy "depoimentos: equipe gerencia" on public.testimonials for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- Storage (fotos, plantas, modelos 3D)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-media', 'property-media', true, 52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'video/mp4', 'model/gltf-binary', 'model/gltf+json', 'application/octet-stream', 'application/pdf'])
on conflict (id) do nothing;

create policy "mídia: leitura pública" on storage.objects for select using (bucket_id = 'property-media');
create policy "mídia: equipe envia" on storage.objects for insert with check (bucket_id = 'property-media' and public.is_staff());
create policy "mídia: equipe atualiza" on storage.objects for update using (bucket_id = 'property-media' and public.is_staff());
create policy "mídia: equipe remove" on storage.objects for delete using (bucket_id = 'property-media' and public.is_staff());
