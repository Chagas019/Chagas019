import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEnv } from './helpers.js';
import { decrypt, encrypt, hashPassword, verifyPassword } from '../src/security/crypto.js';
import { authenticate, createSession, createUser, getSessionUser, hasRole } from '../src/security/auth.js';
import { zonedToUtc, zonedParts, addDays } from '../src/lib/time.js';
import { enqueue, claimNext, failJob, completeJob } from '../src/orchestrator/queue.js';
import { PermanentError } from '../src/lib/errors.js';
import { allocateCalendar, findConsecutiveRepeats, themeSimilarity } from '../src/agents/calendar.js';
import { DEFAULT_SETTINGS } from '../src/db/settingsDefaults.js';
import { buildCaption, checkCopy } from '../src/quality/copy.js';
import { redact } from '../src/lib/logger.js';

beforeEach(() => {
  setupTestEnv();
});

describe('segurança', () => {
  it('criptografa e descriptografa tokens (AES-256-GCM)', () => {
    const enc = encrypt('EAAG-token-ficticio');
    expect(enc).not.toContain('EAAG');
    expect(decrypt(enc)).toBe('EAAG-token-ficticio');
    const tampered = enc.slice(0, -4) + 'AAAA';
    expect(() => decrypt(tampered)).toThrow();
  });

  it('hash de senha scrypt', () => {
    const h = hashPassword('senha-muito-segura-123');
    expect(verifyPassword('senha-muito-segura-123', h)).toBe(true);
    expect(verifyPassword('errada', h)).toBe(false);
  });

  it('sessões e papéis', () => {
    expect(() => createUser('a@b.com', 'A', 'curta')).toThrow();
    const id = createUser('admin@ficticio.com', 'Admin', 'senha-muito-segura-123', 'editor');
    expect(authenticate('admin@ficticio.com', 'x')).toBeNull();
    const u = authenticate('ADMIN@ficticio.com', 'senha-muito-segura-123')!;
    expect(u.id).toBe(id);
    const token = createSession(u.id);
    const s = getSessionUser(token)!;
    expect(s.email).toBe('admin@ficticio.com');
    expect(hasRole(s, 'viewer')).toBe(true);
    expect(hasRole(s, 'admin')).toBe(false);
  });

  it('logs ocultam segredos', () => {
    const r: any = redact({ access_token: 'abc', nested: { password: 'x' }, url: 'https://x?access_token=SEGREDO&a=1' });
    expect(JSON.stringify(r)).not.toContain('SEGREDO');
    expect(r.access_token).toBe('[REDACTED]');
  });
});

describe('fuso horário', () => {
  it('converte horário de São Paulo para UTC', () => {
    const d = zonedToUtc('2026-11-19', '18:30', 'America/Sao_Paulo');
    expect(d.toISOString()).toBe('2026-11-19T21:30:00.000Z');
    expect(zonedParts(d, 'America/Sao_Paulo').time).toBe('18:30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('fila de tarefas', () => {
  it('deduplica, respeita lanes e faz retry com backoff', () => {
    expect(enqueue({ type: 't', lane: 'publisher', dedupeKey: 'k1' })).toBeTruthy();
    expect(enqueue({ type: 't', lane: 'publisher', dedupeKey: 'k1' })).toBeNull();
    enqueue({ type: 't', lane: 'publisher', dedupeKey: 'k2' });
    const j1 = claimNext('w')!;
    expect(j1).toBeTruthy();
    expect(claimNext('w')).toBeNull(); // mesma lane ocupada
    expect(failJob(j1, new Error('transitório'))).toBe(true); // reagendado
    const j2 = claimNext('w')!; // k2 roda agora
    expect(j2.dedupe_key).toBe('k2');
    expect(failJob(j2, new PermanentError('permanente'))).toBe(false); // vai para dead
    completeJob(j2.id, {});
  });
});

describe('calendário editorial', () => {
  it('30 dias sem repetir pilar em dias consecutivos e com distribuição dos pilares', () => {
    const plan = allocateCalendar({ startDate: '2026-12-01', days: 30, pillars: DEFAULT_SETTINGS.pillars, reelsPerDay: 1, feedPerDay: 1, times: DEFAULT_SETTINGS.publish_times });
    expect(plan.filter((p) => p.slot === 'reel')).toHaveLength(30);
    expect(plan.filter((p) => p.slot === 'stories')).toHaveLength(30);
    const feed = plan.filter((p) => p.slot === 'feed');
    expect(new Set(feed.map((f) => f.format))).toEqual(new Set(['CAROUSEL', 'IMAGE']));
    for (const slot of ['reel', 'feed']) {
      const seq = plan.filter((p) => p.slot === slot);
      for (let i = 1; i < seq.length; i++) expect(seq[i].pillar).not.toBe(seq[i - 1].pillar);
    }
    const byDate = new Map<string, string[]>();
    for (const p of plan.filter((x) => x.slot !== 'stories')) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p.pillar]);
    const dates = [...byDate.keys()].sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Set(byDate.get(dates[i - 1]));
      for (const p of byDate.get(dates[i])!) expect(prev.has(p)).toBe(false);
    }
    const used = new Set(plan.map((p) => p.pillar));
    expect(used.size).toBeGreaterThanOrEqual(8);
  });

  it('detecta temas repetidos em dias consecutivos', () => {
    expect(themeSimilarity('Luz natural na janela', 'Luz natural da janela para retratos')).toBeGreaterThan(0.4);
    const c = findConsecutiveRepeats([
      { date: '2026-12-01', slot: 'reel', theme: 'Modo retrato do iPhone', pillar: 'a' },
      { date: '2026-12-02', slot: 'reel', theme: 'Modo retrato iPhone', pillar: 'b' },
      { date: '2026-12-03', slot: 'reel', theme: 'Apps de edição gratuitos', pillar: 'c' },
    ]);
    expect(c).toHaveLength(1);
  });
});

describe('revisão de copy', () => {
  const rules = { maxHashtags: 15, maxLength: 2200, forbidden: ['garantido'] };
  it('aprova legenda boa e reprova vazia/proibida/clichê', () => {
    const full = buildCaption({ hook: 'Gancho', body: 'Corpo útil', cta: 'Salve', hashtags: ['#Foto', 'foto', 'celular'] });
    expect(full.match(/#foto/g)).toHaveLength(1);
    expect(checkCopy({ hook: 'Gancho', body: 'Corpo útil', cta: 'Salve', hashtags: [], fullText: full }, rules).filter((i) => i.severity !== 'minor')).toHaveLength(0);
    expect(checkCopy({ body: '', hashtags: [], fullText: '' }, rules).some((i) => i.code === 'empty_caption')).toBe(true);
    expect(checkCopy({ body: 'Resultado garantido', hashtags: [], fullText: 'Resultado garantido', cta: 'x' }, rules).some((i) => i.code === 'forbidden')).toBe(true);
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' ');
    expect(checkCopy({ body: 'x', hashtags: [], fullText: `x ${tags}`, cta: 'x' }, rules).find((i) => i.code === 'hashtags')?.severity).toBe('critical');
    expect(checkCopy({ body: 'No mundo de hoje, confira e descubra o segredo', hashtags: [], fullText: 'No mundo de hoje, confira e descubra o segredo', cta: 'x' }, rules).find((i) => i.code === 'cliche')?.severity).toBe('major');
  });
});
