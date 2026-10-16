// Função da Vercel: GET /api/lectio?data=aaaa-mm-dd
// Busca a liturgia do dia na API pública e devolve no formato do site, com cache na CDN.
import { normalizeLiturgia } from '../lib/normalize.js';

const BASE = process.env.LITURGIA_API || 'https://liturgia.up.railway.app/v2/';

const hojeEmBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export default async function handler(req, res) {
  const pedida = String(req.query?.data || hojeEmBrasilia());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida)) {
    return res.status(400).json({ erro: 'Use ?data=aaaa-mm-dd' });
  }
  const [ano, mes, dia] = pedida.split('-');
  const url = new URL(BASE);
  url.searchParams.set('dia', String(Number(dia)));
  url.searchParams.set('mes', String(Number(mes)));
  url.searchParams.set('ano', ano);

  try {
    const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`A fonte respondeu ${r.status}`);
    const liturgia = normalizeLiturgia(await r.json(), pedida);
    // Liturgia de um dia não muda: 12 h na CDN, e serve a antiga enquanto revalida.
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json(liturgia);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ erro: 'Não consegui buscar a liturgia agora.', detalhe: String(e?.message || e) });
  }
}
