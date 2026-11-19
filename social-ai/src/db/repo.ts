import { getDb, json } from './db.js';
import { DEFAULT_SETTINGS, type Settings } from './settingsDefaults.js';
import type { Brand } from '../creative/brandDefaults.js';

export function getSettings(): Settings {
  const rows = getDb().all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: any = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) out[r.key] = json.parse(r.value, out[r.key]);
  return out;
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  const row = getDb().get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? json.parse(row.value, DEFAULT_SETTINGS[key]) : DEFAULT_SETTINGS[key];
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  getDb().run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key, JSON.stringify(value),
  );
}

export function getBrand(): Brand {
  const r = getDb().get('SELECT * FROM brand_settings WHERE id = 1')!;
  return {
    brand_name: r.brand_name,
    handle: r.handle,
    niche: r.niche,
    audience: r.audience,
    tone: r.tone,
    colors: json.parse(r.colors, {} as any),
    fonts: json.parse(r.fonts, {} as any),
    layout: json.parse(r.layout, {} as any),
    base_hashtags: json.parse(r.base_hashtags, []),
    forbidden_words: json.parse(r.forbidden_words, []),
    rules: json.parse(r.rules, []),
  };
}

export function updateBrand(patch: Partial<Brand>) {
  const cur = getBrand();
  const b = { ...cur, ...patch };
  getDb().run(
    `UPDATE brand_settings SET brand_name=?, handle=?, niche=?, audience=?, tone=?, colors=?, fonts=?, layout=?,
     base_hashtags=?, forbidden_words=?, rules=?, updated_at=datetime('now') WHERE id = 1`,
    b.brand_name, b.handle ?? null, b.niche, b.audience ?? null, b.tone, JSON.stringify(b.colors), JSON.stringify(b.fonts),
    JSON.stringify(b.layout), JSON.stringify(b.base_hashtags), JSON.stringify(b.forbidden_words), JSON.stringify(b.rules),
  );
  return getBrand();
}

export function audit(action: string, opts: { userId?: number | null; entity?: string; entityId?: string | number; details?: unknown; ip?: string } = {}) {
  getDb().run(
    'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)',
    opts.userId ?? null, action, opts.entity ?? null, opts.entityId != null ? String(opts.entityId) : null,
    opts.details !== undefined ? JSON.stringify(opts.details) : null, opts.ip ?? null,
  );
}

export function setIntegrationStatus(key: string, status: 'not_configured' | 'ok' | 'error' | 'degraded', details: unknown = {}, error: string | null = null) {
  getDb().run(
    `UPDATE integrations SET status=?, details=?, last_error=?, last_check_at=datetime('now') WHERE key=?`,
    status, JSON.stringify(details), error, key,
  );
}

export function getActiveAccount() {
  return getDb().get(`SELECT * FROM instagram_accounts WHERE status = 'connected' ORDER BY id DESC LIMIT 1`);
}
