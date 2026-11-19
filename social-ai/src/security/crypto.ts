import crypto from 'node:crypto';
import { env } from '../config/env.js';

function key(): Buffer {
  const k = env().ENCRYPTION_KEY;
  if (!k) {
    if (env().NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY ausente');
    // Desenvolvimento/teste: chave derivada local e fixa (nunca usada em produção).
    return crypto.createHash('sha256').update('social-ai-dev-only-key').digest();
  }
  const buf = Buffer.from(k, 'base64');
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY deve ter 32 bytes em base64 (npm run key:generate)');
  return buf;
}

/** AES-256-GCM. Formato: v1:<iv>:<tag>:<ciphertext> (base64). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [v, iv, tag, data] = payload.split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Formato de segredo inválido');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split(':');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function hmac(data: string): string {
  const secret = env().SESSION_SECRET || 'social-ai-dev-session-secret';
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
