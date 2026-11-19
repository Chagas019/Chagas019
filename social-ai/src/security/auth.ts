import { getDb } from '../db/db.js';
import { hashPassword, randomToken, sha256, verifyPassword } from './crypto.js';

export type Role = 'admin' | 'editor' | 'viewer';
export interface SessionUser { id: number; email: string; name: string; role: Role }

const SESSION_HOURS = 12;
const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

export function hasRole(user: SessionUser | null | undefined, min: Role) {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export function createUser(email: string, name: string, password: string, role: Role = 'admin') {
  if (password.length < 12) throw new Error('A senha deve ter pelo menos 12 caracteres');
  const r = getDb().run(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
    email.toLowerCase().trim(), name, hashPassword(password), role,
  );
  return r.lastId;
}

export function authenticate(email: string, password: string): SessionUser | null {
  const u = getDb().get('SELECT * FROM users WHERE email = ? AND active = 1', email.toLowerCase().trim());
  // Executa scrypt mesmo quando o usuário não existe (evita enumeração por tempo de resposta).
  const ok = verifyPassword(password, u?.password_hash ?? 'scrypt:AAAAAAAAAAAAAAAAAAAAAA==:' + 'A'.repeat(86));
  if (!u || !ok) return null;
  getDb().run(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, u.id);
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export function createSession(userId: number, ip?: string, ua?: string): string {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();
  getDb().run('INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)', sha256(token), userId, expires, ip ?? null, ua ?? null);
  return token;
}

export function getSessionUser(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = getDb().get(
    `SELECT u.id, u.email, u.name, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND u.active = 1`,
    sha256(token),
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function destroySession(token: string) {
  getDb().run('DELETE FROM sessions WHERE id = ?', sha256(token));
}

export function ensureBootstrapAdmin(email?: string, password?: string) {
  const count = getDb().get<{ n: number }>('SELECT COUNT(*) n FROM users')!.n;
  if (count === 0 && email && password) createUser(email, 'Administrador', password, 'admin');
}
