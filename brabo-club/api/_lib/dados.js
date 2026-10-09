// Dados e regras compartilhados pelas funções da API do Brabo Club.
// Tudo fica num Blob privado da Vercel: config/precos.json e uma reserva por arquivo em reservas/.
import { get, put, list, head, del } from '@vercel/blob';
import crypto from 'node:crypto';

export const TZ = 'America/Sao_Paulo';
export const DIAS_AFRENTE = 14;

export const SERVICOS_PADRAO = [
  { id: 'corte',       nome: 'Corte',             desc: 'Máquina e tesoura, com lavagem', min: 40,  preco: 40 },
  { id: 'barba',       nome: 'Barba',             desc: 'Modelagem e acabamento',         min: 30,  preco: 30 },
  { id: 'combo',       nome: 'Corte + barba',     desc: 'O combo completo',               min: 60,  preco: 60 },
  { id: 'navalha',     nome: 'Barba na navalha',  desc: 'Com toalha quente',              min: 40,  preco: 40 },
  { id: 'pezinho',     nome: 'Pezinho',           desc: 'Acabamento do contorno',         min: 15,  preco: 15 },
  { id: 'sobrancelha', nome: 'Sobrancelha',       desc: 'Na navalha ou na pinça',         min: 15,  preco: 15 },
  { id: 'pigmentacao', nome: 'Pigmentação',       desc: 'Barba ou cabelo',                min: 30,  preco: 30 },
  { id: 'platinado',   nome: 'Platinado / luzes', desc: 'Descoloração completa',          min: 120, preco: 120 }
];
export const BASE_IDS = ['corte', 'barba', 'combo', 'navalha'];

const HORAS_A = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const HORAS_B = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
export const BARBEIROS = {
  vitinho: { nome: 'Vitinho', dias: [2, 3, 4, 5, 6], horas: HORAS_A },
  mycon:   { nome: 'Mycon',   dias: [1, 2, 3, 4, 5], horas: HORAS_B },
  rian:    { nome: 'Rian',    dias: [3, 4, 5, 6, 0], horas: HORAS_A }
};

const PRECOS_PATH = 'config/precos.json';
const RESERVA_RE = /^(vitinho|mycon|rian)_(\d{4}-\d{2}-\d{2})_(\d{4})$/;

// ---- datas no fuso de Campinas ----
export function agoraSP() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
export function somaDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// ---- respostas ----
export function json(body, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache }
  });
}

// ---- acesso do dono: chave guardada na variável ADMIN_KEY ----
export function autorizado(request) {
  const chave = process.env.ADMIN_KEY || '';
  const veio = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!chave || !veio) return false;
  const a = crypto.createHash('sha256').update(chave).digest();
  const b = crypto.createHash('sha256').update(veio).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---- blob ----
async function lerJSON(pathname) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

// Cada serviço tem um preço por barbeiro (precos.vitinho, precos.mycon, precos.rian).
// "preco" é o menor deles, usado no site como "a partir de".
const BARB_IDS = Object.keys(BARBEIROS);
function completar(s, x) {
  const base = x && Number.isFinite(Number(x.preco)) ? Number(x.preco) : s.preco;
  const precos = {};
  for (const b of BARB_IDS) {
    const v = x && x.precos ? Number(x.precos[b]) : NaN;
    precos[b] = Number.isFinite(v) ? v : base;
  }
  return {
    id: s.id,
    nome: x ? x.nome : s.nome,
    desc: x ? x.desc : s.desc,
    min: x ? x.min : s.min,
    precos,
    preco: Math.min(...Object.values(precos))
  };
}

export async function lerPrecos() {
  const salvo = await lerJSON(PRECOS_PATH).catch(() => null);
  const lista = (salvo && Array.isArray(salvo.servicos)) ? salvo.servicos : [];
  return SERVICOS_PADRAO.map(s => completar(s, lista.find(v => v && v.id === s.id)));
}

export function precoDe(servico, barbeiro) {
  return servico.precos && Number.isFinite(servico.precos[barbeiro]) ? servico.precos[barbeiro] : servico.preco;
}

export function validarPrecos(entrada) {
  if (!Array.isArray(entrada)) return { erro: 'Envie a lista de serviços.' };
  const out = [];
  for (const s of SERVICOS_PADRAO) {
    const x = entrada.find(v => v && v.id === s.id);
    if (!x) return { erro: `Falta o serviço ${s.nome}.` };
    const nome = String(x.nome || '').trim().slice(0, 40);
    const desc = String(x.desc || '').trim().slice(0, 90);
    const min = Math.round(Number(x.min));
    if (nome.length < 2) return { erro: `Dê um nome para ${s.nome}.` };
    if (!Number.isFinite(min) || min < 5 || min > 480) return { erro: `Tempo inválido em ${nome} (5 a 480 minutos).` };
    const precos = {};
    for (const b of BARB_IDS) {
      const bruto = x.precos ? x.precos[b] : x.preco;
      const v = Math.round(Number(bruto) * 100) / 100;
      if (bruto === '' || bruto == null || !Number.isFinite(v) || v < 0 || v > 5000) return { erro: `Preço inválido em ${nome} para ${BARBEIROS[b].nome}.` };
      precos[b] = v;
    }
    out.push({ id: s.id, nome, desc, min, precos, preco: Math.min(...Object.values(precos)) });
  }
  return { servicos: out };
}

export async function salvarPrecos(servicos) {
  await put(PRECOS_PATH, JSON.stringify({ servicos, atualizado: new Date().toISOString() }), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60
  });
}

async function listarReservas() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: 'reservas/', cursor, limit: 1000 });
    for (const b of r.blobs) {
      const id = b.pathname.replace(/^reservas\//, '').replace(/\.json$/, '');
      const m = RESERVA_RE.exec(id);
      if (m) out.push({ id, data: m[2], pathname: b.pathname });
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

export async function idsOcupados() {
  const hoje = agoraSP().data;
  return (await listarReservas()).filter(r => r.data >= hoje).map(r => r.id);
}

export async function reservasFuturas() {
  const hoje = agoraSP().data;
  const lista = (await listarReservas()).filter(r => r.data >= hoje);
  const docs = await Promise.all(lista.map(async r => {
    const d = await lerJSON(r.pathname).catch(() => null);
    if (!d) return null;
    const { chaveHash, ...resto } = d;
    return { id: r.id, ...resto };
  }));
  return docs.filter(Boolean).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
}

// Grava a reserva só se o arquivo ainda não existir: dois clientes não ficam com o mesmo horário
export async function criarReserva(id, dados) {
  const pathname = `reservas/${id}.json`;
  try {
    await put(pathname, JSON.stringify(dados), {
      access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json'
    });
    return 'ok';
  } catch (e) {
    const existe = await head(pathname).then(() => true, () => false);
    if (existe) return 'ocupado';
    throw e;
  }
}

// ---- o cliente vê e desmarca só as reservas que ele mesmo fez (código guardado no aparelho dele) ----
export function novoCodigo() { return crypto.randomBytes(18).toString('base64url'); }
export function hashCodigo(c) { return crypto.createHash('sha256').update(String(c)).digest('hex'); }
function codigoConfere(reserva, codigo) {
  if (!reserva || !reserva.chaveHash || !codigo) return false;
  const a = Buffer.from(reserva.chaveHash, 'hex'), b = Buffer.from(hashCodigo(codigo), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export async function reservaDoCliente(id, codigo) {
  if (!RESERVA_RE.test(String(id))) return null;
  const d = await lerJSON(`reservas/${id}.json`).catch(() => null);
  if (!codigoConfere(d, codigo)) return null;
  const { chaveHash, ...resto } = d;
  return { id, ...resto };
}

export async function apagarReserva(id) {
  if (!RESERVA_RE.test(id)) return false;
  await del(`reservas/${id}.json`);
  return true;
}

// ---- validação do pedido de agendamento ----
export function validarPedido(p, precos) {
  if (!p || typeof p !== 'object') return { erro: 'Pedido inválido.' };
  if (p.site) return { erro: 'Pedido inválido.' }; // campo-isca contra robôs
  const b = BARBEIROS[p.barbeiro];
  if (!b) return { erro: 'Escolha um barbeiro.' };
  const data = String(p.data || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: 'Escolha o dia.' };
  const agora = agoraSP();
  if (data < agora.data || data > somaDias(agora.data, DIAS_AFRENTE - 1)) return { erro: 'Esse dia não está na agenda.' };
  if (!b.dias.includes(diaSemana(data))) return { erro: `${b.nome} não atende nesse dia.` };
  const hora = String(p.hora || '');
  if (!b.horas.includes(hora)) return { erro: 'Escolha um horário da lista.' };
  if (data === agora.data && hora <= agora.hora) return { erro: 'Esse horário já passou.' };
  if (!BASE_IDS.includes(p.servico)) return { erro: 'Escolha o serviço.' };
  const extras = Array.isArray(p.extras) ? [...new Set(p.extras.map(String))] : [];
  if (extras.some(id => BASE_IDS.includes(id) || !precos.find(s => s.id === id))) return { erro: 'Adicional inválido.' };
  const nome = String(p.nome || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (nome.length < 2) return { erro: 'Digite seu nome.' };
  const telefone = String(p.telefone || '').trim().slice(0, 20);
  const dig = telefone.replace(/\D/g, '');
  if (dig.length < 10 || dig.length > 13) return { erro: 'Digite um WhatsApp com DDD.' };
  const preco = id => precoDe(precos.find(s => s.id === id), p.barbeiro);
  const total = extras.reduce((a, id) => a + preco(id), preco(p.servico));
  const hhmm = hora.replace(':', '');
  return {
    id: `${p.barbeiro}_${data}_${hhmm}`,
    reserva: { barbeiro: p.barbeiro, servico: p.servico, extras, total, data, hora, nome, telefone, criado: new Date().toISOString() }
  };
}
