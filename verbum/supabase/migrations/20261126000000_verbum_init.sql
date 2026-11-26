-- VERBUM — esquema inicial
-- "users" é a tabela auth.users do Supabase Auth; os dados públicos do usuário ficam em public.profiles.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────── Perfis e planos ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  ministry text check (char_length(ministry) <= 120),
  role_title text check (char_length(role_title) <= 80),
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Catálogo público (somente leitura) ─────────────────────────
create table public.songs (
  id text primary key,
  title text not null,
  artist text not null,
  themes text[] not null default '{}',
  contexts text[] not null default '{}',
  spotify_url text,
  youtube_url text,
  rationale text,
  verified boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

create table public.preachers (
  id text primary key,
  name text not null,
  description text,
  official_url text,
  themes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher_id text references public.preachers (id) on delete set null,
  url text not null unique,
  platform text not null default 'youtube',
  format text check (format in ('video', 'audio', 'texto')),
  duration_seconds integer check (duration_seconds >= 0),
  themes text[] not null default '{}',
  published_at timestamptz,
  source text,
  created_at timestamptz not null default now()
);

create table public.theological_sources (
  id text primary key,
  title text not null,
  author text not null,
  kind text not null,
  year integer,
  context text,
  themes text[] not null default '{}',
  url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bible_references (
  id text primary key,
  reference text not null,          -- ex.: "Lc 15,11-32"
  book text not null,
  chapter integer not null check (chapter > 0),
  verse_start integer,
  verse_end integer,
  title text not null,              -- descrição curta da perícope
  themes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index songs_themes_idx on public.songs using gin (themes);
create index sources_themes_idx on public.theological_sources using gin (themes);
create index bible_themes_idx on public.bible_references using gin (themes);
create index sermons_themes_idx on public.sermons using gin (themes);
create index songs_title_trgm on public.songs using gin (title extensions.gin_trgm_ops);
create index sources_title_trgm on public.theological_sources using gin (title extensions.gin_trgm_ops);

-- ───────────────────────── Dados privados do usuário ─────────────────────────
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('song', 'source', 'sermon', 'preacher', 'bible', 'catechism', 'saint', 'video', 'link')),
  ref_id text not null,
  title text not null,
  subtitle text,
  url text,
  payload jsonb not null default '{}',
  folder_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id),
  -- a pasta precisa ser do mesmo usuário
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete set null (folder_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Sem título' check (char_length(title) <= 160),
  body text not null default '' check (char_length(body) <= 50000),
  folder_id uuid,
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete set null (folder_id)
);

create table public.sermon_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null default 'pregacao' check (kind in ('pregacao', 'encontro', 'retiro', 'formacao', 'estudo', 'grupo-de-oracao')),
  status text not null default 'rascunho' check (status in ('rascunho', 'pronto', 'realizado')),
  event_date date,
  brief jsonb not null default '{}',     -- tema, público, duração, objetivo...
  content jsonb,                         -- roteiro gerado/editado
  folder_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete set null (folder_id)
);

alter table public.notes
  add constraint notes_project_fk foreign key (project_id, user_id)
  references public.sermon_projects (id, user_id) on delete set null (project_id);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  query text not null check (char_length(query) between 1 and 200),
  scope text not null default 'tudo',
  results_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index saved_items_user_idx on public.saved_items (user_id, created_at desc);
create index notes_user_idx on public.notes (user_id, updated_at desc);
create index projects_user_idx on public.sermon_projects (user_id, updated_at desc);
create index history_user_idx on public.search_history (user_id, created_at desc);
create index folders_user_idx on public.folders (user_id);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.sermon_projects for each row execute function public.touch_updated_at();

-- ───────────────────────── Uso da IA (base para planos) ─────────────────────────
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,              -- 'AAAA-MM'
  count integer not null default 0,
  primary key (user_id, period)
);

-- Consome 1 crédito do mês; devolve o total usado ou -1 se o limite do plano gratuito foi atingido.
create or replace function public.consume_ai_credit(free_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  user_plan text;
  used integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select plan into user_plan from public.profiles where id = uid;
  insert into public.ai_usage (user_id, period, count) values (uid, p, 0)
    on conflict (user_id, period) do nothing;
  select count into used from public.ai_usage where user_id = uid and period = p for update;
  if coalesce(user_plan, 'free') = 'free' and used >= free_limit then
    return -1;
  end if;
  update public.ai_usage set count = count + 1 where user_id = uid and period = p returning count into used;
  return used;
end $$;

-- Devolve o crédito quando a geração falha (não deixa o contador negativo).
create or replace function public.refund_ai_credit()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = auth.uid() and period = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
end $$;

revoke all on function public.consume_ai_credit(integer) from public, anon;
revoke all on function public.refund_ai_credit() from public, anon;
grant execute on function public.consume_ai_credit(integer) to authenticated;
grant execute on function public.refund_ai_credit() to authenticated;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.preachers enable row level security;
alter table public.sermons enable row level security;
alter table public.theological_sources enable row level security;
alter table public.bible_references enable row level security;
alter table public.folders enable row level security;
alter table public.saved_items enable row level security;
alter table public.notes enable row level security;
alter table public.sermon_projects enable row level security;
alter table public.search_history enable row level security;
alter table public.ai_usage enable row level security;

-- Catálogo: leitura para todos, escrita só pelo service role (sem políticas de escrita).
create policy "catálogo leitura" on public.songs for select to anon, authenticated using (true);
create policy "catálogo leitura" on public.preachers for select to anon, authenticated using (true);
create policy "catálogo leitura" on public.sermons for select to anon, authenticated using (true);
create policy "catálogo leitura" on public.theological_sources for select to anon, authenticated using (true);
create policy "catálogo leitura" on public.bible_references for select to anon, authenticated using (true);

-- Perfil: o próprio usuário lê e edita (exceto o plano).
create policy "perfil próprio leitura" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil próprio edição" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (display_name, ministry, role_title) on public.profiles to authenticated;

-- Dados privados: cada usuário só enxerga e altera os seus.
create policy "dono" on public.folders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.saved_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.sermon_projects for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono" on public.search_history for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "uso próprio leitura" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.ai_usage from authenticated, anon;
