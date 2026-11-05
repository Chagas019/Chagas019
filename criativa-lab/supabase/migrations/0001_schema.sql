-- ═══════════════════════════════════════════════════════════════════════
-- CRIATIVA LAB · Schema do banco (Supabase / PostgreSQL)
-- Execute no SQL Editor do Supabase ou com `supabase db push`.
-- Usuários vivem em auth.users (gerenciado pelo Supabase Auth).
-- ═══════════════════════════════════════════════════════════════════════

-- gen_random_uuid() é nativo no PostgreSQL 13+ (Supabase usa 15+).

-- ───────────────────────── Catálogo (conteúdo público) ─────────────────────────

create table if not exists public.challenges (
  slug          text primary key,
  title         text not null,
  category      text not null check (category in ('fotografia','design','video','direcao-de-arte','social','tipografia','livre')),
  kind          text not null check (kind in ('diario','especial-7','especial-30')),
  difficulty    text not null check (difficulty in ('iniciante','intermediario','avancado')),
  minutes       int  not null check (minutes > 0),
  xp            int  not null check (xp >= 0),
  summary       text not null,
  objective     text not null,
  instructions  text[] not null default '{}',
  steps         text[],
  reference_slugs text[] not null default '{}',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists public.creative_references (
  slug        text primary key,
  title       text not null,
  kind        text not null check (kind in ('fotografia','cartaz','identidade','tipografia','paleta','campanha','direcao-de-arte','composicao')),
  author      text not null,
  year        int,
  description text not null,
  insight     text not null,
  palette     text[] not null default '{}',
  tags        text[] not null default '{}',
  seed        int not null default 1,
  ratio       text not null default 'square' check (ratio in ('portrait','landscape','square')),
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  slug       text primary key,
  title      text not null,
  subtitle   text not null,
  category   text not null,
  level      text not null check (level in ('iniciante','intermediario','avancado')),
  color      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  course_slug text not null references public.courses(slug) on delete cascade,
  slug        text not null,
  title       text not null,
  minutes     int  not null,
  body        text[] not null default '{}',
  exercise    text not null,
  position    int  not null default 0,
  primary key (course_slug, slug)
);

-- ───────────────────────── Dados do usuário ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  bio         text not null default '' check (char_length(bio) <= 280),
  focus       text[] not null default '{}',
  weekly_goal int  not null default 4 check (weekly_goal between 1 and 14),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  challenge_slug text not null references public.challenges(slug) on delete cascade,
  step           int,
  note           text not null default '' check (char_length(note) <= 600),
  xp             int  not null default 0 check (xp between 0 and 5000),
  created_at     timestamptz not null default now()
);
-- Um desafio (ou uma etapa) só pode ser concluído uma vez por usuário.
create unique index if not exists completions_unique_step
  on public.completions (user_id, challenge_slug, coalesce(step, -1));

create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  reference_slug text not null references public.creative_references(slug) on delete cascade,
  collection_id  uuid references public.collections(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (user_id, reference_slug)
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1500),
  category    text not null,
  images      text[] not null default '{}' check (cardinality(images) <= 6),
  status      text not null default 'ideia' check (status in ('ideia','em-andamento','concluido')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  lesson_slug text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, course_slug, lesson_slug),
  foreign key (course_slug, lesson_slug) references public.lessons(course_slug, slug) on delete cascade
);

-- Histórico de atividades: fonte única do XP (soma de xp).
create table if not exists public.activities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('challenge_completed','lesson_completed','reference_saved','project_created','project_updated','idea_generated','idea_saved','signup')),
  label      text not null check (char_length(label) <= 300),
  xp         int  not null default 0 check (xp between 0 and 5000),
  meta       jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_ideas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

-- Visão de progresso agregado (XP, nível bruto, desafios) por usuário.
create or replace view public.user_progress
with (security_invoker = true) as
select
  p.id as user_id,
  coalesce((select sum(a.xp) from public.activities a where a.user_id = p.id), 0)::int as xp,
  (select count(*) from public.completions c where c.user_id = p.id)::int as challenges_completed,
  (select count(*) from public.lesson_progress l where l.user_id = p.id)::int as lessons_completed,
  (select count(*) from public.projects pr where pr.user_id = p.id)::int as projects
from public.profiles p;

-- Índices para as consultas da aplicação (sempre filtradas por user_id + ordenadas por data)
create index if not exists completions_user_idx  on public.completions (user_id, created_at desc);
create index if not exists favorites_user_idx    on public.favorites (user_id, created_at desc);
create index if not exists collections_user_idx  on public.collections (user_id, created_at desc);
create index if not exists projects_user_idx     on public.projects (user_id, created_at desc);
create index if not exists lessons_user_idx      on public.lesson_progress (user_id, created_at desc);
create index if not exists activities_user_idx   on public.activities (user_id, created_at desc);
create index if not exists ideas_user_idx        on public.saved_ideas (user_id, created_at desc);

-- ───────────────────────── Triggers ─────────────────────────

-- Cria o perfil automaticamente no cadastro (nome vem do metadata do signUp).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- Impede que o cliente infle o XP: o XP da conclusão precisa bater com o desafio.
create or replace function public.validate_completion_xp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ch record;
  expected int;
begin
  select xp, coalesce(cardinality(steps), 0) as n into ch from public.challenges where slug = new.challenge_slug;
  if not found then raise exception 'Desafio inexistente'; end if;
  if new.step is null then
    expected := ch.xp;
  else
    if ch.n = 0 or new.step < 0 or new.step >= ch.n then raise exception 'Etapa inválida'; end if;
    expected := round(ch.xp::numeric / ch.n);
  end if;
  new.xp := expected;
  return new;
end $$;

drop trigger if exists completions_xp on public.completions;
create trigger completions_xp before insert on public.completions for each row execute function public.validate_completion_xp();

-- Limita o XP por tipo de atividade (os valores espelham src/lib/gamification.ts).
create or replace function public.validate_activity_xp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_xp int;
begin
  max_xp := case new.type
    when 'challenge_completed' then 1800
    when 'lesson_completed'    then 25
    when 'reference_saved'     then 5
    when 'project_created'     then 40
    when 'idea_generated'      then 10
    when 'idea_saved'          then 5
    when 'signup'              then 20
    else 0 end;
  if new.xp > max_xp then new.xp := max_xp; end if;
  return new;
end $$;

drop trigger if exists activities_xp on public.activities;
create trigger activities_xp before insert on public.activities for each row execute function public.validate_activity_xp();

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.challenges          enable row level security;
alter table public.creative_references enable row level security;
alter table public.courses             enable row level security;
alter table public.lessons             enable row level security;
alter table public.profiles            enable row level security;
alter table public.completions         enable row level security;
alter table public.collections         enable row level security;
alter table public.favorites           enable row level security;
alter table public.projects            enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.activities          enable row level security;
alter table public.saved_ideas         enable row level security;

-- Catálogo: leitura pública; escrita só via service role (painel/admin).
drop policy if exists "catalogo leitura" on public.challenges;
create policy "catalogo leitura" on public.challenges for select using (true);
drop policy if exists "catalogo leitura" on public.creative_references;
create policy "catalogo leitura" on public.creative_references for select using (true);
drop policy if exists "catalogo leitura" on public.courses;
create policy "catalogo leitura" on public.courses for select using (true);
drop policy if exists "catalogo leitura" on public.lessons;
create policy "catalogo leitura" on public.lessons for select using (true);

-- Perfil: cada usuário lê e edita apenas o próprio.
drop policy if exists "perfil proprio select" on public.profiles;
create policy "perfil proprio select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "perfil proprio insert" on public.profiles;
create policy "perfil proprio insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "perfil proprio update" on public.profiles;
create policy "perfil proprio update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Tabelas do usuário: CRUD restrito ao dono (user_id = auth.uid()).
do $$
declare t text;
begin
  foreach t in array array['completions','collections','favorites','projects','lesson_progress','activities','saved_ideas'] loop
    execute format('drop policy if exists "dono select" on public.%I', t);
    execute format('create policy "dono select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "dono insert" on public.%I', t);
    execute format('create policy "dono insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "dono delete" on public.%I', t);
    execute format('create policy "dono delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
  -- Somente tabelas editáveis recebem UPDATE (conclusões e histórico são imutáveis).
  foreach t in array array['collections','favorites','projects','saved_ideas'] loop
    execute format('drop policy if exists "dono update" on public.%I', t);
    execute format('create policy "dono update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Coleção de um favorito precisa pertencer ao mesmo usuário.
create or replace function public.validate_favorite_collection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.collection_id is not null and not exists (
    select 1 from public.collections c where c.id = new.collection_id and c.user_id = new.user_id
  ) then
    raise exception 'Coleção inválida';
  end if;
  return new;
end $$;

drop trigger if exists favorites_collection on public.favorites;
create trigger favorites_collection before insert or update on public.favorites for each row execute function public.validate_favorite_collection();

-- ───────────────────────── Storage (imagens do portfólio) ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuário só grava/remove dentro da pasta com seu próprio id: portfolio/<uid>/arquivo
drop policy if exists "portfolio leitura" on storage.objects;
create policy "portfolio leitura" on storage.objects for select using (bucket_id = 'portfolio');
drop policy if exists "portfolio upload proprio" on storage.objects;
create policy "portfolio upload proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "portfolio update proprio" on storage.objects;
create policy "portfolio update proprio" on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "portfolio delete proprio" on storage.objects;
create policy "portfolio delete proprio" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
