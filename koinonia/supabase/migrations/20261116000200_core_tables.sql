-- KOINONIA — 0002: usuários, perfis, talentos e comunidades

-- Perfil público/semipúblico (1:1 com auth.users). Contatos ficam em profile_private.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio text not null default '' check (char_length(bio) <= 1000),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  country_code char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  availability public.availability_slot[] not null default '{}',
  hours_per_week smallint check (hours_per_week between 0 and 80),
  visibility public.profile_visibility not null default 'members',
  message_permission public.message_permission not null default 'everyone',
  preferred_locale text not null default 'pt-BR' check (preferred_locale in ('pt-BR', 'en', 'es')),
  onboarded_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(bio, '') || ' ' || coalesce(city, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_country_idx on public.profiles (country_code);
create index profiles_languages_idx on public.profiles using gin (languages);
create index profiles_availability_idx on public.profiles using gin (availability);
create index profiles_search_idx on public.profiles using gin (search_document);
create index profiles_name_trgm_idx on public.profiles using gin (display_name gin_trgm_ops);

-- Dados de contato privados: somente o próprio usuário lê/escreve.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (char_length(phone) <= 30),
  contact_email text check (char_length(contact_email) <= 254),
  marketing_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Papéis de plataforma (moderador/admin). Separado do perfil para impedir autopromoção.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.platform_role not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Catálogo de talentos com nomes traduzidos: {"pt-BR": "...", "en": "...", "es": "..."}
create table public.skill_categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  names jsonb not null check (names ? 'pt-BR'),
  icon text not null default 'sparkles',
  sort_order smallint not null default 0
);

create table public.skills (
  id integer generated always as identity primary key,
  category_id smallint not null references public.skill_categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  names jsonb not null check (names ? 'pt-BR')
);
create index skills_category_idx on public.skills (category_id);

create table public.profile_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id integer not null references public.skills (id) on delete cascade,
  level public.skill_level not null default 'intermediate',
  years_experience smallint check (years_experience between 0 and 80),
  primary key (profile_id, skill_id)
);
create index profile_skills_skill_idx on public.profile_skills (skill_id);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  url text check (url is null or url ~ '^https?://'),
  created_at timestamptz not null default now()
);
create index portfolio_items_profile_idx on public.portfolio_items (profile_id);

-- Paróquias, comunidades, movimentos...
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 120),
  kind public.community_kind not null,
  description text not null default '' check (char_length(description) <= 3000),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 80),
  diocese text check (char_length(diocese) <= 120),
  website text check (website is null or website ~ '^https?://'),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  status public.community_status not null default 'pending',
  verified_at timestamptz,
  created_by uuid not null references auth.users (id),
  search_document tsvector generated always as (
    to_tsvector('simple', name || ' ' || description || ' ' || city || ' ' || coalesce(diocese, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index communities_status_idx on public.communities (status);
create index communities_country_idx on public.communities (country_code, city);
create index communities_search_idx on public.communities using gin (search_document);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

create table public.community_verifications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  requested_by uuid not null references auth.users (id),
  evidence text not null check (char_length(evidence) between 20 and 3000),
  status public.verification_status not null default 'pending',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_notes text check (char_length(review_notes) <= 2000),
  created_at timestamptz not null default now()
);
create index community_verifications_status_idx on public.community_verifications (status, created_at);
-- No máximo uma solicitação pendente por comunidade.
create unique index community_verifications_one_pending
  on public.community_verifications (community_id) where status = 'pending';
