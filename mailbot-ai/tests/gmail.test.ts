import { describe, expect, it } from 'vitest';
import { GmailApiError, GmailClient, ReauthRequiredError } from '../src/lib/gmail/client';
import { buildAuthUrl, exchangeCode, GMAIL_SCOPES, OAuthError } from '../src/lib/gmail/oauth';
import { htmlToText, parseAddress, parseMessage } from '../src/lib/gmail/parse';
import { FakeGmail, makeMessage } from './helpers/fake-gmail';

const noSleep = async () => {};

describe('Google OAuth', () => {
  it('pede somente gmail.readonly (sem envio/exclusão), offline + PKCE', () => {
    const url = new URL(buildAuthUrl({ clientId: 'cid', clientSecret: 's', redirectUri: 'https://app/cb' }, 'st', 'ch'));
    const scope = url.searchParams.get('scope')!;
    expect(scope).toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(scope).not.toMatch(/gmail\.(send|modify|compose)|mail\.google\.com/);
    expect(GMAIL_SCOPES).toHaveLength(3);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('st');
  });
  it('erro de troca de código vira OAuthError com código do Google', async () => {
    const f = (async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })) as unknown as typeof fetch;
    await expect(exchangeCode({ clientId: 'a', clientSecret: 'b', redirectUri: 'c' }, 'code', 'v', f)).rejects.toMatchObject({ code: 'invalid_grant' });
  });
});

describe('parser de mensagens', () => {
  it('extrai remetente, texto puro e metadados', () => {
    const p = parseMessage(makeMessage('m1', { from: '"Ana Lima" <Ana@Empresa.com>', subject: 'Contrato', body: 'Segue o contrato', labels: ['INBOX', 'UNREAD', 'IMPORTANT'], listUnsub: true }));
    expect(p.fromEmail).toBe('ana@empresa.com');
    expect(p.fromName).toBe('Ana Lima');
    expect(p.bodyText).toBe('Segue o contrato');
    expect(p.isUnread).toBe(true);
    expect(p.hasListUnsubscribe).toBe(true);
    expect(p.contentHash).toHaveLength(64);
  });
  it('converte HTML em texto e remove scripts/estilos', () => {
    expect(htmlToText('<style>x{}</style><p>Olá&nbsp;mundo</p><script>alert(1)</script><br>fim')).toBe('Olá mundo\n\nfim');
    expect(parseMessage(makeMessage('m2', { html: '<div>Fatura <b>R$ 120</b></div>' })).bodyText).toBe('Fatura R$ 120');
  });
  it('endereços sem nome', () => {
    expect(parseAddress('x@y.com')).toEqual({ name: null, email: 'x@y.com' });
  });
});

describe('cliente Gmail API', () => {
  it('renova o token em 401 e repete a chamada', async () => {
    const g = new FakeGmail();
    g.validToken = 'novo';
    const seen: boolean[] = [];
    const c = new GmailClient({ getAccessToken: async (force) => { seen.push(Boolean(force)); return force ? 'novo' : 'velho'; } }, { fetchImpl: g.fetch, sleep: noSleep });
    expect((await c.getProfile()).emailAddress).toBe('eu@gmail.com');
    expect(seen).toEqual([false, true]);
  });
  it('401 persistente => reautorização necessária', async () => {
    const g = new FakeGmail();
    const c = new GmailClient({ getAccessToken: async () => 'errado' }, { fetchImpl: g.fetch, sleep: noSleep });
    await expect(c.getProfile()).rejects.toBeInstanceOf(ReauthRequiredError);
  });
  it('refresh token revogado (invalid_grant) => reautorização', async () => {
    const g = new FakeGmail();
    const c = new GmailClient({ getAccessToken: async () => { throw new OAuthError('invalid_grant'); } }, { fetchImpl: g.fetch, sleep: noSleep });
    await expect(c.getProfile()).rejects.toBeInstanceOf(ReauthRequiredError);
  });
  it('429 com Retry-After: espera e tenta de novo', async () => {
    const g = new FakeGmail();
    g.failNext = { status: 429, times: 2, retryAfter: '3' };
    const waits: number[] = [];
    const c = new GmailClient({ getAccessToken: async () => g.validToken }, { fetchImpl: g.fetch, sleep: async (ms) => { waits.push(ms); } });
    await c.getProfile();
    expect(waits).toEqual([3000, 3000]);
  });
  it('5xx esgota as tentativas e falha com erro tipado', async () => {
    const g = new FakeGmail();
    g.failNext = { status: 503, times: 10 };
    const c = new GmailClient({ getAccessToken: async () => g.validToken }, { fetchImpl: g.fetch, sleep: noSleep, maxRetries: 2 });
    await expect(c.getProfile()).rejects.toBeInstanceOf(GmailApiError);
  });
  it('getMessages ignora mensagens apagadas no meio do caminho', async () => {
    const g = new FakeGmail();
    g.add(makeMessage('a'));
    const c = new GmailClient({ getAccessToken: async () => g.validToken }, { fetchImpl: g.fetch, sleep: noSleep });
    const r = await c.getMessages(['a', 'sumiu']);
    expect(r.found.map((m) => m.id)).toEqual(['a']);
    expect(r.missing).toEqual(['sumiu']);
  });
});
