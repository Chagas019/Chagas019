-- Banco exclusivo do MAILBOT no Floot (aplicado via execute_sql em 19/11/2026).
-- Só referências e classificação estruturada: o conteúdo dos e-mails nunca é armazenado.
CREATE TYPE mb_priority AS ENUM ('urgente','importante','normal','baixa','spam');
CREATE TYPE mb_category AS ENUM ('trabalho','financeiro','pessoal','compromissos','informativos');
CREATE TYPE mb_action AS ENUM ('responder','pagar','comparecer','revisar','acompanhar','ler','ignorar');
CREATE TYPE mb_reason AS ENUM ('prazo_proximo','pedido_direto','cobranca','compromisso','trabalho','contato_pessoal','informativo','promocional','suspeito','vip','remetente_ignorado','outro');
CREATE TYPE mb_triage_status AS ENUM ('pending','done','skipped','error');
CREATE TYPE mb_agent AS ENUM ('triage','summary','chat');
CREATE TYPE mb_sync_kind AS ENUM ('initial','incremental','full_resync');
CREATE TYPE mb_sync_status AS ENUM ('running','success','partial','error');
CREATE TYPE mb_conn_status AS ENUM ('connected','reauth_required','disconnected');
CREATE TYPE mb_report_kind AS ENUM ('daily','weekly');
CREATE TYPE mb_source AS ENUM ('rules','ai','cache');
CREATE TYPE mb_role AS ENUM ('user','assistant');

CREATE TABLE user_preferences (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  sync_frequency_minutes integer NOT NULL DEFAULT 60 CHECK (sync_frequency_minutes IN (0,15,30,60,180,360,720,1440)),
  daily_report_hour integer NOT NULL DEFAULT 7 CHECK (daily_report_hour BETWEEN 0 AND 23),
  initial_sync_days integer NOT NULL DEFAULT 90 CHECK (initial_sync_days BETWEEN 0 AND 3650),
  vip_senders text[] NOT NULL DEFAULT '{}',
  work_domains text[] NOT NULL DEFAULT '{}',
  ignored_senders text[] NOT NULL DEFAULT '{}',
  ai_daily_credit_budget numeric(12,4) NOT NULL DEFAULT 50 CHECK (ai_daily_credit_budget >= 0),
  last_daily_report_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gmail_accounts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  google_email text NOT NULL,
  status mb_conn_status NOT NULL DEFAULT 'connected',
  history_id text, initial_sync_done boolean NOT NULL DEFAULT false, page_token text,
  messages_total integer, last_sync_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_categories (slug text PRIMARY KEY, label text NOT NULL, description text NOT NULL, derived boolean NOT NULL DEFAULT false, sort integer NOT NULL);
INSERT INTO email_categories (slug,label,description,derived,sort) VALUES
 ('urgentes','Urgentes','Prazos próximos, problemas importantes, atenção imediata',true,1),
 ('responder','Precisam de resposta','Alguém espera uma resposta sua',true,2),
 ('trabalho','Trabalho','Assuntos profissionais, clientes e projetos',false,3),
 ('financeiro','Financeiro','Cobranças, pagamentos, faturas, bancos',false,4),
 ('pessoal','Pessoais','Família, amigos e assuntos pessoais relevantes',false,5),
 ('compromissos','Compromissos','Reuniões, eventos, consultas e agendamentos',false,6),
 ('informativos','Informativos','Newsletters, notificações e comunicações sem ação',false,7);
CREATE TABLE emails (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  gmail_id text NOT NULL, thread_id text NOT NULL, received_at timestamptz NOT NULL,
  label_ids text[] NOT NULL DEFAULT '{}', is_unread boolean NOT NULL DEFAULT false, is_sent boolean NOT NULL DEFAULT false,
  sender_hash text NOT NULL, content_hash text NOT NULL, has_list_unsubscribe boolean NOT NULL DEFAULT false,
  triage_status mb_triage_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, gmail_id)
);
CREATE INDEX emails_user_received_idx ON emails (user_id, received_at DESC);
CREATE INDEX emails_user_thread_idx ON emails (user_id, thread_id);
CREATE INDEX emails_user_pending_idx ON emails (user_id) WHERE triage_status = 'pending';
CREATE INDEX emails_user_sender_idx ON emails (user_id, sender_hash);
CREATE TABLE email_summaries (
  email_id bigint PRIMARY KEY REFERENCES emails(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category mb_category NOT NULL, priority mb_priority NOT NULL,
  relevance_score integer NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  needs_reply boolean NOT NULL DEFAULT false, deadline date, is_bill boolean NOT NULL DEFAULT false,
  is_appointment boolean NOT NULL DEFAULT false, appointment_at timestamptz,
  action mb_action NOT NULL, reason mb_reason NOT NULL, source mb_source NOT NULL, model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_summaries_user_priority_idx ON email_summaries (user_id, priority, relevance_score DESC);
CREATE INDEX email_summaries_user_category_idx ON email_summaries (user_id, category);
CREATE TABLE daily_reports (
  id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind mb_report_kind NOT NULL, period_start date NOT NULL, period_end date NOT NULL,
  content jsonb NOT NULL, email_count integer NOT NULL DEFAULT 0, fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, kind, period_start)
);
CREATE TABLE sync_history (
  id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind mb_sync_kind NOT NULL, status mb_sync_status NOT NULL DEFAULT 'running',
  fetched integer NOT NULL DEFAULT 0, added integer NOT NULL DEFAULT 0, updated integer NOT NULL DEFAULT 0, deleted integer NOT NULL DEFAULT 0,
  error text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX sync_history_user_idx ON sync_history (user_id, started_at DESC);
CREATE TABLE ai_conversations (
  id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_user_idx ON ai_conversations (user_id, updated_at DESC);
CREATE TABLE ai_conversation_messages (
  id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, role mb_role NOT NULL, content text NOT NULL DEFAULT '',
  agent mb_agent, intent text, refs jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversation_messages_conv_idx ON ai_conversation_messages (conversation_id, created_at);
CREATE TABLE ai_usage (
  id bigserial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent mb_agent NOT NULL, model text NOT NULL, credits numeric(14,6) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_idx ON ai_usage (user_id, created_at DESC);
CREATE TABLE ai_cache (key text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE rate_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL);
