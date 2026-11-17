-- KOINONIA — 0003: oportunidades, mensagens, recursos, avaliações, notificações, moderação e auditoria

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 20 and 5000),
  mode public.opportunity_mode not null,
  status public.opportunity_status not null default 'draft',
  country_code char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  availability public.availability_slot[] not null default '{}',
  slots smallint check (slots between 1 and 10000),
  starts_at timestamptz,
  ends_at timestamptz,
  search_document tsvector generated always as (
    to_tsvector('simple', title || ' ' || description || ' ' || coalesce(city, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_dates_chk check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint opportunities_location_chk check (mode = 'remote' or country_code is not null)
);
create index opportunities_status_created_idx on public.opportunities (status, created_at desc);
create index opportunities_community_idx on public.opportunities (community_id);
create index opportunities_location_idx on public.opportunities (country_code, city);
create index opportunities_languages_idx on public.opportunities using gin (languages);
create index opportunities_search_idx on public.opportunities using gin (search_document);

create table public.opportunity_skills (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  skill_id integer not null references public.skills (id) on delete cascade,
  primary key (opportunity_id, skill_id)
);
create index opportunity_skills_skill_idx on public.opportunity_skills (skill_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 2000),
  status public.application_status not null default 'pending',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);
create index applications_applicant_idx on public.applications (applicant_id, created_at desc);
create index applications_opportunity_idx on public.applications (opportunity_id, status);

-- Mensagens
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities (id) on delete set null,
  created_by uuid not null references auth.users (id),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- Banco de recursos compartilhados
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  kind public.resource_kind not null,
  status public.resource_status not null default 'available',
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 80),
  ships_remotely boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resources_location_idx on public.resources (country_code, city, status);
create index resources_community_idx on public.resources (community_id);

create table public.resource_requests (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  requester_community_id uuid references public.communities (id) on delete set null,
  message text not null check (char_length(message) between 10 and 2000),
  starts_on date not null,
  ends_on date not null,
  status public.resource_request_status not null default 'pending',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index resource_requests_resource_idx on public.resource_requests (resource_id, status);
create index resource_requests_requester_idx on public.resource_requests (requester_id);

-- Avaliações (após colaboração concluída). Exatamente um avaliado: perfil OU comunidade.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_profile_id uuid references public.profiles (id) on delete cascade,
  reviewee_community_id uuid references public.communities (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1500),
  created_at timestamptz not null default now(),
  unique (application_id, reviewer_id),
  check (num_nonnulls(reviewee_profile_id, reviewee_community_id) = 1)
);
create index reviews_profile_idx on public.reviews (reviewee_profile_id);
create index reviews_community_idx on public.reviews (reviewee_community_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_.]{3,60}$'),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'abuse', 'fraud', 'inappropriate', 'impersonation', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references auth.users (id),
  handled_at timestamptz,
  resolution_notes text check (char_length(resolution_notes) <= 2000),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create unique index reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id) where status in ('open', 'reviewing');

-- Auditoria: escrita apenas por funções SECURITY DEFINER; leitura apenas por admins.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Rate limiting no banco (independe da borda/CDN).
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup_idx on public.rate_limit_events (user_id, action, created_at desc);
