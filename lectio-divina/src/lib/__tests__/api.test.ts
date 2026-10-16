import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/lectio.js';

function fakeRes() {
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: undefined as any };
  return Object.assign(res, {
    setHeader: (k: string, v: string) => ((res.headers[k] = v), res),
    status: (c: number) => ((res.statusCode = c), res),
    json: (b: unknown) => ((res.body = b), res),
  });
}

const dancrf = { data: '16/10/2026', liturgia: 'X', cor: 'Verde', leituras: { evangelho: [{ referencia: 'Lc 12,1-7', titulo: '', texto: 'T' }] } };
const cnbb = { content: { color: 'verde', leituras: '<div>Leituras:</div><div>a</div><div>b</div><div></div><div>Lc 12,1-7</div>', body: '<h3>EVANGELHO</h3><p>T</p>' } };

afterEach(() => vi.unstubAllGlobals());

describe('/api/lectio', () => {
  it('usa a API Liturgia Diária com dia, mês e ano', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(dancrf)));
    vi.stubGlobal('fetch', fetch);
    const res = fakeRes();
    await handler({ query: { data: '2026-10-16' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fonte).toBe('liturgia-diaria');
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toContain('dia=16&mes=10&ano=2026');
    expect(res.headers['Cache-Control']).toContain('s-maxage');
  });

  it('cai para a CNBB quando a primeira fonte falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) =>
      String(url).includes('edicoescnbb') ? new Response(JSON.stringify(cnbb)) : new Response('fora', { status: 503 })));
    const res = fakeRes();
    await handler({ query: { data: '2026-10-16' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fonte).toBe('cnbb');
    expect(res.body.evangelho.referencia).toBe('Lc 12,1-7');
  });

  it('responde 502 quando todas falham e 400 com data inválida', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    const r1 = fakeRes();
    await handler({ query: { data: '2026-10-16' } }, r1);
    expect(r1.statusCode).toBe(502);
    const r2 = fakeRes();
    await handler({ query: { data: 'ontem' } }, r2);
    expect(r2.statusCode).toBe(400);
  });
});
