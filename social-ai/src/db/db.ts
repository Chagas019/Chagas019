import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { migrations } from './migrations.js';
import { env } from '../config/env.js';
import { AGENT_DEFINITIONS } from '../agents/definitions.js';
import { PRESETS, presetSettings } from '../config/presets.js';
import { DEFAULT_BRAND } from '../creative/brandDefaults.js';

export type Row = Record<string, any>;
export type Param = SQLInputValue;

/** Wrapper fino sobre o SQLite nativo do Node (node:sqlite). */
export class Database {
  readonly raw: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    this.raw = new DatabaseSync(file);
    this.raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  }

  all<T = any>(sql: string, ...params: Param[]): T[] {
    return this.raw.prepare(sql).all(...params) as T[];
  }
  get<T = any>(sql: string, ...params: Param[]): T {
    return this.raw.prepare(sql).get(...params) as T;
  }
  run(sql: string, ...params: Param[]) {
    const r = this.raw.prepare(sql).run(...params);
    return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
  }
  exec(sql: string) {
    this.raw.exec(sql);
  }
  tx<T>(fn: () => T): T {
    this.raw.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      this.raw.exec('COMMIT');
      return out;
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }
  close() {
    this.raw.close();
  }

  migrate() {
    this.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT DEFAULT (datetime('now')))`);
    const applied = new Set(this.all<{ id: number }>('SELECT id FROM schema_migrations').map((r) => r.id));
    for (const m of migrations) {
      if (applied.has(m.id)) continue;
      this.tx(() => {
        this.exec(m.sql);
        this.run('INSERT INTO schema_migrations (id, name) VALUES (?, ?)', m.id, m.name);
      });
    }
    this.seedDefaults();
  }

  /** Dados de configuração padrão (não são dados fictícios de conteúdo). */
  seedDefaults() {
    for (const a of AGENT_DEFINITIONS) {
      this.run(
        `INSERT INTO agents (key, name, role, instructions, tools) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET name=excluded.name, role=excluded.role, tools=excluded.tools`,
        a.key, a.name, a.role, a.instructions, JSON.stringify(a.tools),
      );
    }
    // Perfil pronto: só define valores ainda inexistentes (nunca sobrescreve ajustes do painel).
    const presetKey = env().SOCIAL_AI_PRESET in PRESETS ? env().SOCIAL_AI_PRESET : 'fotografia_mobile';
    for (const [key, value] of Object.entries(presetSettings(presetKey))) {
      this.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
    const b: any = { ...DEFAULT_BRAND, handle: null, audience: null, tone: null, ...PRESETS[presetKey].brand };
    this.run(
      `INSERT OR IGNORE INTO brand_settings (id, brand_name, handle, niche, audience, tone, colors, fonts, layout, base_hashtags, forbidden_words, rules)
       VALUES (1, ?, ?, ?, ?, COALESCE(?, 'Próximo, criativo, didático e direto. Fala como um criador experiente conversando com um amigo.'), ?, ?, ?, ?, ?, ?)`,
      b.brand_name, b.handle, b.niche, b.audience, b.tone, JSON.stringify(b.colors), JSON.stringify(b.fonts),
      JSON.stringify(b.layout), JSON.stringify(b.base_hashtags), JSON.stringify(b.forbidden_words), JSON.stringify(b.rules),
    );
    const integrations: [string, string][] = [
      ['instagram', 'Instagram Graph API (Meta)'],
      ['anthropic', 'Claude API (Anthropic) — agentes'],
      ['image_gen', 'API de geração de imagens'],
      ['ffmpeg', 'FFmpeg — renderização de vídeo'],
      ['public_media', 'Hospedagem pública de mídia (PUBLIC_BASE_URL)'],
    ];
    for (const [key, name] of integrations) this.run('INSERT OR IGNORE INTO integrations (key, name) VALUES (?, ?)', key, name);
  }
}

let instance: Database | null = null;

export function getDb(): Database {
  if (!instance) {
    instance = new Database(env().DATABASE_PATH);
    instance.migrate();
  }
  return instance;
}

export function setDb(db: Database | null) {
  instance = db;
}

export function createTestDb(): Database {
  const db = new Database(':memory:');
  db.migrate();
  setDb(db);
  return db;
}

export const json = {
  parse<T = any>(v: unknown, fallback: T): T {
    if (v === null || v === undefined || v === '') return fallback;
    try {
      return JSON.parse(String(v)) as T;
    } catch {
      return fallback;
    }
  },
  str(v: unknown) {
    return JSON.stringify(v ?? null);
  },
};

export const nowIso = () => new Date().toISOString();
