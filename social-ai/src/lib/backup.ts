import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { getDb } from '../db/db.js';
import { logger } from './logger.js';

/** Backup consistente do SQLite (VACUUM INTO) com retenção de 14 cópias. Mídias: ver docs/DEPLOY.md. */
export function runBackup(keep = 14) {
  const dir = path.resolve(env().BACKUP_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `social-ai-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const all = fs.readdirSync(dir).filter((f) => f.startsWith('social-ai-') && f.endsWith('.db')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(dir, old));
  logger.info('Backup concluído', { file });
  return { file };
}
