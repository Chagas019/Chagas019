import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupTestEnv, fakeGraph } from './helpers.js';
import { buildServer } from '../src/api/server.js';
import { createUser } from '../src/security/auth.js';
import { getDb } from '../src/db/db.js';
import { getSettings } from '../src/db/repo.js';

let app: FastifyInstance;
let adminCookie = '';
let viewerCookie = '';

async function login(email: string, password: string) {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  expect(r.statusCode).toBe(200);
  return String(r.headers['set-cookie']).split(';')[0];
}

describe('API administrativa', () => {
  beforeAll(async () => {
    setupTestEnv({ META_APP_ID: '123', META_APP_SECRET: 'ficticio', META_REDIRECT_URI: 'https://exemplo.invalid/cb' });
    createUser('admin@ficticio.com', 'Admin', 'senha-muito-segura-1', 'admin');
    createUser('viewer@ficticio.com', 'Viewer', 'senha-muito-segura-2', 'viewer');
    app = await buildServer();
    adminCookie = await login('admin@ficticio.com', 'senha-muito-segura-1');
    viewerCookie = await login('viewer@ficticio.com', 'senha-muito-segura-2');
  });

  it('exige autenticação e respeita papéis', async () => {
    expect((await app.inject({ url: '/api/dashboard' })).statusCode).toBe(401);
    expect((await app.inject({ url: '/api/dashboard', headers: { cookie: viewerCookie } })).statusCode).toBe(200);
    const r = await app.inject({ method: 'PUT', url: '/api/settings', headers: { cookie: viewerCookie }, payload: {} });
    expect(r.statusCode).toBe(403);
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@ficticio.com', password: 'errada' } });
    expect(bad.statusCode).toBe(401);
  });

  it('bloqueia requisição de outra origem (CSRF)', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/emergency/pause', headers: { cookie: adminCookie, origin: 'https://malicioso.invalid', host: 'localhost' }, payload: {} });
    expect(r.statusCode).toBe(403);
  });

  it('dashboard mostra modo de desenvolvimento e sem conta', async () => {
    const r = await app.inject({ url: '/api/dashboard', headers: { cookie: adminCookie } });
    const d = r.json();
    expect(d.agents).toHaveLength(6);
    expect(d.flags.production_mode).toBe(false);
    expect(d.account).toBeNull();
    expect(d.routine).toHaveLength(5);
  });

  it('atualiza frequência e valida entrada', async () => {
    const ok = await app.inject({ method: 'PUT', url: '/api/settings', headers: { cookie: adminCookie }, payload: { frequency: { reels_per_day: 2, feed_per_day: 1, stories_min: 3, stories_max: 4 } } });
    expect(ok.statusCode).toBe(200);
    expect(getSettings().frequency.reels_per_day).toBe(2);
    const bad = await app.inject({ method: 'PUT', url: '/api/settings', headers: { cookie: adminCookie }, payload: { frequency: { reels_per_day: 99 } } });
    expect(bad.statusCode).toBe(400);
    // production_mode não pode ser ligado por essa rota
    await app.inject({ method: 'PUT', url: '/api/settings', headers: { cookie: adminCookie }, payload: { production_mode: true } });
    expect(getSettings().production_mode).toBe(false);
  });

  it('botão de emergência e modo de produção protegido', async () => {
    const p = await app.inject({ method: 'POST', url: '/api/emergency/pause', headers: { cookie: adminCookie }, payload: { reason: 'teste' } });
    expect(p.json().paused).toBe(true);
    expect(getSettings().publishing_paused).toBe(true);
    await app.inject({ method: 'POST', url: '/api/emergency/resume', headers: { cookie: adminCookie }, payload: {} });
    expect(getSettings().publishing_paused).toBe(false);
    const prod = await app.inject({ method: 'POST', url: '/api/production', headers: { cookie: adminCookie }, payload: { enabled: true, confirmation: 'ATIVAR PRODUÇÃO' } });
    expect(prod.statusCode).toBe(422);
    expect(prod.json().error).toMatch(/Requisitos pendentes/);
    const audit = getDb().all(`SELECT action FROM audit_logs`).map((a) => a.action);
    expect(audit).toContain('emergency.pause');
  });

  it('OAuth: gera URL oficial com state assinado e conecta conta via Graph API (HTTP falso)', async () => {
    const r = await app.inject({ url: '/api/instagram/oauth/start', headers: { cookie: adminCookie } });
    const url = new URL(r.json().url);
    expect(url.hostname).toBe('www.facebook.com');
    expect(url.searchParams.get('scope')).toContain('instagram_content_publish');
    const state = url.searchParams.get('state')!;
    const stateCookie = String(r.headers['set-cookie']).split(';')[0];
    fakeGraph({
      'GET oauth/access_token': (u) => ({ access_token: u.searchParams.get('grant_type') ? 'long-token-ficticio' : 'short', expires_in: 5184000 }),
      'GET me/accounts': () => ({ data: [{ id: 'page1', name: 'Página', instagram_business_account: { id: '1789', username: 'perfil_ficticio' } }] }),
      'GET me/permissions': () => ({ data: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'].map((permission) => ({ permission, status: 'granted' })) }),
      'GET 1789': () => ({ id: '1789', username: 'perfil_ficticio', followers_count: 1234, media_count: 50 }),
      'GET 1789/content_publishing_limit': () => ({ data: [{ quota_usage: 0, config: { quota_total: 100 } }] }),
    });
    const cb = await app.inject({ url: `/api/instagram/oauth/callback?code=abc&state=${encodeURIComponent(state)}`, headers: { cookie: `${adminCookie}; ${stateCookie}` } });
    expect(cb.statusCode).toBe(302);
    const acc = getDb().get(`SELECT * FROM instagram_accounts`);
    expect(acc.username).toBe('perfil_ficticio');
    expect(acc.access_token_enc).not.toContain('long-token');
    const integ = (await app.inject({ url: '/api/integrations', headers: { cookie: adminCookie } })).json();
    expect(integ.account.access_token_enc).toBeUndefined();
    // Sem PUBLIC_BASE_URL HTTPS a elegibilidade fica pendente → não dá para confirmar permissões
    const conf = await app.inject({ method: 'POST', url: '/api/instagram/confirm-permissions', headers: { cookie: adminCookie }, payload: {} });
    expect(conf.statusCode).toBe(422);
  });

  it('rejeita state OAuth forjado', async () => {
    const r = await app.inject({ url: `/api/instagram/oauth/callback?code=abc&state=forjado.assinatura`, headers: { cookie: `${adminCookie}; sai_oauth_state=forjado.assinatura` } });
    expect(r.statusCode).toBe(400);
  });

  it('mídia pública só serve nomes válidos', async () => {
    expect((await app.inject({ url: '/media/public/../../etc/passwd' })).body).not.toContain('root:');
    expect((await app.inject({ url: '/media/public/abc.jpg' })).statusCode).toBe(404);
  });
});
