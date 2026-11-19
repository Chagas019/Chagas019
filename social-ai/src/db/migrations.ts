/**
 * Migrações versionadas. Cada item é aplicado uma única vez (tabela schema_migrations).
 * SQLite em modo WAL — adequado para uma instância única. Ver docs/DEPLOY.md para escalar.
 */
export const migrations: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','editor','viewer')) DEFAULT 'viewer',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,               -- sha256 do token
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip TEXT, user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE instagram_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ig_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  name TEXT,
  biography TEXT,
  account_type TEXT,
  followers_count INTEGER,
  media_count INTEGER,
  profile_picture_url TEXT,
  page_id TEXT,
  access_token_enc TEXT,             -- AES-256-GCM
  token_expires_at TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  eligibility TEXT NOT NULL DEFAULT '{}',
  permissions_confirmed INTEGER NOT NULL DEFAULT 0,
  niche TEXT,
  niche_suggestion TEXT,
  niche_confirmed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agents (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tools TEXT NOT NULL DEFAULT '[]',
  memory TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','error','paused')),
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  lane TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed','dead','cancelled')),
  priority INTEGER NOT NULL DEFAULT 5,
  run_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  dedupe_key TEXT UNIQUE,
  locked_by TEXT,
  locked_at TEXT,
  last_error TEXT,
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_jobs_claim ON jobs(status, run_at, priority);

CREATE TABLE agent_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_key TEXT NOT NULL REFERENCES agents(key),
  job_id INTEGER REFERENCES jobs(id),
  status TEXT NOT NULL CHECK (status IN ('running','success','error')),
  input TEXT, output TEXT, error TEXT,
  tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT,
  duration_ms INTEGER
);
CREATE INDEX idx_exec_agent ON agent_executions(agent_key, started_at);

CREATE TABLE agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_key TEXT,
  execution_id INTEGER,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_logs_created ON agent_logs(created_at);

CREATE TABLE trends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  source TEXT NOT NULL,              -- hashtag_search | business_discovery | web_search | own_account
  title TEXT NOT NULL,
  summary TEXT,
  topic TEXT,
  format TEXT,
  hook_pattern TEXT,
  narrative_structure TEXT,
  duration_seconds INTEGER,
  visual_style TEXT,
  cta_pattern TEXT,
  adaptation_potential INTEGER,      -- 0..100
  momentum TEXT,                     -- rising | stable | declining
  engagement_signal TEXT NOT NULL DEFAULT '{}',
  reference_urls TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_trends_date ON trends(report_date);

CREATE TABLE content_ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trend_id INTEGER REFERENCES trends(id),
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  pillar TEXT NOT NULL,
  objective TEXT NOT NULL,
  format TEXT NOT NULL,
  audience TEXT,
  hook TEXT,
  cta TEXT,
  suggested_time TEXT,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE editorial_calendar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,                -- reel | feed | stories
  scheduled_time TEXT NOT NULL,      -- HH:MM (fuso da aplicação)
  format TEXT NOT NULL,              -- REELS | CAROUSEL | IMAGE | STORIES
  pillar TEXT NOT NULL,
  theme TEXT,
  content_idea_id INTEGER REFERENCES content_ideas(id),
  project_id INTEGER,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(date, slot)
);

CREATE TABLE content_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calendar_id INTEGER REFERENCES editorial_calendar(id),
  idea_id INTEGER REFERENCES content_ideas(id),
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','copy_ready','rendering','review','approved','rejected','scheduled','published','failed')),
  script TEXT NOT NULL DEFAULT '{}',
  slides TEXT NOT NULL DEFAULT '[]',
  stories TEXT NOT NULL DEFAULT '[]',
  quality_report TEXT,
  requires_human_review INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES content_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- image | slide | cover | video | story
  position INTEGER NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL UNIQUE,    -- nome não adivinhável (servido publicamente para a Graph API)
  mime TEXT NOT NULL,
  width INTEGER, height INTEGER,
  duration_seconds REAL,
  size_bytes INTEGER,
  sha256 TEXT NOT NULL,
  quality_score INTEGER,
  quality_issues TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'template',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE captions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT,
  hook TEXT,
  body TEXT NOT NULL,
  cta TEXT,
  hashtags TEXT NOT NULL DEFAULT '[]',
  full_text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'copywriter',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, version)
);

CREATE TABLE publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES content_projects(id),
  account_id INTEGER REFERENCES instagram_accounts(id),
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE','CAROUSEL','REELS','STORIES')),
  scheduled_at TEXT NOT NULL,        -- ISO UTC
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','publishing','retrying','published','failed','blocked','cancelled')),
  asset_ids TEXT NOT NULL DEFAULT '[]',
  caption_id INTEGER REFERENCES captions(id),
  content_hash TEXT NOT NULL,
  container_id TEXT,
  ig_media_id TEXT UNIQUE,
  permalink TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  block_reasons TEXT NOT NULL DEFAULT '[]',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Proteção de duplicidade no nível do banco: o mesmo conteúdo não pode ter duas publicações ativas.
CREATE UNIQUE INDEX uq_publication_hash_active ON publications(content_hash)
  WHERE status IN ('scheduled','publishing','retrying','published');
CREATE INDEX idx_pub_sched ON publications(status, scheduled_at);

CREATE TABLE publication_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  reach INTEGER, impressions INTEGER, views INTEGER,
  likes INTEGER, comments INTEGER, shares INTEGER, saved INTEGER,
  total_interactions INTEGER, profile_visits INTEGER, follows INTEGER,
  avg_watch_time_ms INTEGER,
  raw TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_metrics_pub ON publication_metrics(publication_id, collected_at);

CREATE TABLE account_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES instagram_accounts(id),
  date TEXT NOT NULL,
  followers_count INTEGER,
  media_count INTEGER,
  reach INTEGER,
  profile_views INTEGER,
  raw TEXT NOT NULL DEFAULT '{}',
  UNIQUE(account_id, date)
);

CREATE TABLE daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('trends','daily','weekly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  summary TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(type, period_start)
);

CREATE TABLE brand_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  brand_name TEXT NOT NULL DEFAULT 'SOCIAL AI',
  handle TEXT,
  niche TEXT NOT NULL DEFAULT 'Fotografia mobile',
  audience TEXT,
  tone TEXT NOT NULL DEFAULT 'Próximo, criativo, didático e direto. Fala como um criador experiente conversando com um amigo.',
  colors TEXT NOT NULL,
  fonts TEXT NOT NULL,
  layout TEXT NOT NULL,
  base_hashtags TEXT NOT NULL DEFAULT '[]',
  forbidden_words TEXT NOT NULL DEFAULT '[]',
  rules TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE integrations (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','ok','error','degraded')),
  details TEXT NOT NULL DEFAULT '{}',
  last_check_at TEXT,
  last_error TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT, entity_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE hashtag_queries (
  hashtag TEXT NOT NULL,
  hashtag_id TEXT,
  queried_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`,
  },
  {
    id: 2,
    name: 'liturgy_days',
    sql: `
CREATE TABLE liturgy_days (
  date TEXT PRIMARY KEY,
  celebration TEXT,
  liturgical_season TEXT,
  liturgical_color TEXT,
  first_reading TEXT,
  psalm TEXT,
  psalm_refrain TEXT,
  second_reading TEXT,
  gospel TEXT,
  saint_of_day TEXT,
  sources TEXT NOT NULL DEFAULT '[]',
  confidence TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`,
  },
];
