// Banco SQLite embutido no Node (node:sqlite) com migrações versionadas.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS = [
  // 1 — estrutura inicial
  `
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);

  CREATE TABLE departments (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT, diretor_slug TEXT, ordem INTEGER
  );
  CREATE TABLE rooms (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, departamento_id TEXT REFERENCES departments(id),
    descricao TEXT, ordem INTEGER
  );
  CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    numero INTEGER NOT NULL UNIQUE,
    nome TEXT NOT NULL, avatar TEXT NOT NULL, cargo TEXT NOT NULL,
    departamento_id TEXT NOT NULL REFERENCES departments(id),
    sala_id TEXT REFERENCES rooms(id),
    superior_slug TEXT,
    nivel TEXT NOT NULL,
    descricao TEXT, missao TEXT,
    objetivos TEXT, responsabilidades TEXT, competencias TEXT,
    system_prompt TEXT NOT NULL,
    ferramentas TEXT NOT NULL, acoes_aprovacao TEXT NOT NULL,
    tipos_tarefa TEXT NOT NULL, criterios_qualidade TEXT, regras_delegacao TEXT NOT NULL,
    limites_custo TEXT NOT NULL, rotina TEXT, kpis TEXT,
    estado TEXT NOT NULL DEFAULT 'disponivel', estado_desde TEXT,
    modelo TEXT NOT NULL, esforco TEXT NOT NULL DEFAULT 'medium',
    ativo INTEGER NOT NULL DEFAULT 1,
    seed_hash TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );

  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, segmento TEXT,
    contexto TEXT, tom_de_voz TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id),
    nome TEXT NOT NULL, escopo TEXT, status TEXT NOT NULL DEFAULT 'ativo', created_at TEXT NOT NULL
  );

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL, descricao TEXT, tipo TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id), project_id INTEGER REFERENCES projects(id),
    assigned_slug TEXT NOT NULL REFERENCES employees(slug),
    created_by TEXT NOT NULL, parent_id INTEGER REFERENCES tasks(id),
    review_of INTEGER REFERENCES tasks(id), workflow_run_id INTEGER,
    complexidade TEXT NOT NULL DEFAULT 'normal',
    prioridade INTEGER NOT NULL DEFAULT 3, prazo TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    criterios_aceitacao TEXT NOT NULL DEFAULT '[]',
    feedback TEXT, motivo TEXT,
    attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3,
    revisoes INTEGER NOT NULL DEFAULT 0,
    auto_execute INTEGER NOT NULL DEFAULT 1,
    locked_until TEXT, lock_owner TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, finished_at TEXT
  );
  CREATE INDEX idx_tasks_status ON tasks(status);
  CREATE INDEX idx_tasks_assigned ON tasks(assigned_slug);
  CREATE TABLE task_deps (
    task_id INTEGER NOT NULL REFERENCES tasks(id), depends_on INTEGER NOT NULL REFERENCES tasks(id),
    PRIMARY KEY (task_id, depends_on)
  );
  CREATE TABLE task_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id),
    autor TEXT NOT NULL, tipo TEXT NOT NULL, texto TEXT NOT NULL, created_at TEXT NOT NULL
  );

  CREATE TABLE deliverables (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id),
    employee_slug TEXT NOT NULL, client_id INTEGER, titulo TEXT NOT NULL, formato TEXT,
    conteudo TEXT NOT NULL, arquivos TEXT NOT NULL DEFAULT '[]', limitacoes TEXT,
    validacao TEXT, aprovado INTEGER, created_at TEXT NOT NULL
  );
  CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id),
    review_task_id INTEGER REFERENCES tasks(id), deliverable_id INTEGER REFERENCES deliverables(id),
    revisor_slug TEXT NOT NULL, decisao TEXT NOT NULL, motivos TEXT, ajustes TEXT, created_at TEXT NOT NULL
  );

  CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER REFERENCES tasks(id),
    employee_slug TEXT NOT NULL, client_id INTEGER, modelo TEXT, status TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
    web_searches INTEGER NOT NULL DEFAULT 0,
    custo_usd REAL NOT NULL DEFAULT 0, iteracoes INTEGER NOT NULL DEFAULT 0,
    erro TEXT, resultado TEXT, started_at TEXT NOT NULL, finished_at TEXT
  );
  CREATE TABLE tool_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER REFERENCES runs(id), task_id INTEGER,
    employee_slug TEXT NOT NULL, ferramenta TEXT NOT NULL, entrada TEXT, ok INTEGER NOT NULL,
    resultado TEXT, approval_id INTEGER, created_at TEXT NOT NULL
  );

  CREATE TABLE approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, acao TEXT NOT NULL, descricao TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}', solicitado_por TEXT NOT NULL, task_id INTEGER, client_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pendente', decidido_por TEXT, decidido_em TEXT, observacao TEXT,
    executado_por TEXT, executado_em TEXT, resultado TEXT, created_at TEXT NOT NULL
  );

  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, ator TEXT NOT NULL, acao TEXT NOT NULL,
    alvo TEXT, detalhes TEXT, approval_id INTEGER, task_id INTEGER, client_id INTEGER
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, employee_slug TEXT NOT NULL, client_id INTEGER,
    autor TEXT NOT NULL, conteudo TEXT NOT NULL, run_id INTEGER, created_at TEXT NOT NULL
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, para TEXT NOT NULL, tipo TEXT NOT NULL, mensagem TEXT NOT NULL,
    task_id INTEGER, lida INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );

  CREATE TABLE routines (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, fase TEXT NOT NULL, horario TEXT NOT NULL,
    descricao TEXT, usa_ia INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE routine_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, routine_id TEXT NOT NULL REFERENCES routines(id),
    data TEXT NOT NULL, status TEXT NOT NULL, resumo TEXT, started_at TEXT NOT NULL, finished_at TEXT,
    UNIQUE (routine_id, data)
  );
  CREATE TABLE daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, employee_slug TEXT NOT NULL, data TEXT NOT NULL,
    tipo TEXT NOT NULL, conteudo TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE (employee_slug, data, tipo)
  );

  CREATE TABLE workflow_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT NOT NULL, client_id INTEGER,
    iniciado_por TEXT NOT NULL, briefing TEXT, status TEXT NOT NULL DEFAULT 'em_andamento', created_at TEXT NOT NULL
  );

  CREATE TABLE crm_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empresa TEXT NOT NULL, segmento TEXT, contato TEXT, fonte TEXT,
    etapa TEXT NOT NULL DEFAULT 'novo', qualificacao TEXT, notas TEXT, client_id INTEGER,
    registrado_por TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE finance_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, categoria TEXT NOT NULL, descricao TEXT NOT NULL,
    valor REAL NOT NULL, data TEXT NOT NULL, client_id INTEGER, status TEXT NOT NULL DEFAULT 'previsto',
    registrado_por TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, task_id INTEGER, nome TEXT NOT NULL,
    caminho TEXT NOT NULL, mime TEXT, bytes INTEGER, criado_por TEXT NOT NULL, excluido INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
  `,
];

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get();
  let v = row ? row.version : 0;
  if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  while (v < MIGRATIONS.length) {
    tx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.prepare('UPDATE schema_version SET version = ?').run(v + 1);
    });
    v++;
  }
  return v;
}

// Transação simples (aninhamento vira savepoint)
let depth = 0;
export function tx(db, fn) {
  const sp = `sp${depth}`;
  db.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
  depth++;
  try {
    const r = fn();
    depth--;
    db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
    return r;
  } catch (e) {
    depth--;
    db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}`);
    throw e;
  }
}

export const now = () => new Date().toISOString();
export const J = (v) => JSON.stringify(v ?? null);
export const P = (s, d = null) => {
  if (s === null || s === undefined || s === '') return d;
  try { return JSON.parse(s); } catch { return d; }
};
