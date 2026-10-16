// Função da Vercel: GET /api/lectio?data=aaaa-mm-dd
// Busca a liturgia do dia em fontes públicas e devolve no formato do site, com cache na CDN.
//   1. API Liturgia Diária (github.com/Dancrf/liturgia-diaria)
//   2. reserva: API das Edições CNBB (api-liturgia.edicoescnbb.com.br)
import { normalizeLiturgia } from '../lib/normalize.js';
import { CNBB_BASE, normalizeCnbb } from '../lib/cnbb.js';

const BASE = process.env.LITURGIA_API || 'https://liturgia.up.railway.app/v2/';
const HEADERS = { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (LectioDivinaDiaria)' };

const hojeEmBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

async function getJson(url) {
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
  return r.json();
}

const FONTES = [
  {
    nome: 'liturgia-diaria',
    async buscar(iso) {
      const [ano, mes, dia] = iso.split('-');
      const url = new URL(BASE);
      url.searchParams.set('dia', String(Number(dia)));
      url.searchParams.set('mes', String(Number(mes)));
      url.searchParams.set('ano', ano);
      return normalizeLiturgia(await getJson(url), iso);
    },
  },
  {
    nome: 'cnbb',
    async buscar(iso) {
      return normalizeCnbb(await getJson(`${CNBB_BASE}/${iso}`), iso);
    },
  },
];

export default async function handler(req, res) {
  const pedida = String(req.query?.data || hojeEmBrasilia());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida)) {
    return res.status(400).json({ erro: 'Use ?data=aaaa-mm-dd' });
  }

  const falhas = [];
  for (const fonte of FONTES) {
    try {
      const liturgia = await fonte.buscar(pedida);
      // Liturgia de um dia não muda: 12 h na CDN, e serve a antiga enquanto revalida.
      res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
      return res.status(200).json({ ...liturgia, fonte: fonte.nome });
    } catch (e) {
      falhas.push(`${fonte.nome}: ${e?.message || e}`);
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({ erro: 'Não consegui buscar a liturgia agora.', detalhe: falhas });
}
