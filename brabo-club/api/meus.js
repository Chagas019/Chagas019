// Cliente: mostra as reservas feitas neste aparelho (cada uma conferida pelo seu código)
import { json, reservaDoCliente, agoraSP } from './_lib/dados.js';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }
  const itens = Array.isArray(body && body.itens) ? body.itens.slice(0, 30) : [];
  try {
    const hoje = agoraSP().data;
    const lista = await Promise.all(itens.map(i => reservaDoCliente(i && i.id, i && i.codigo).catch(() => null)));
    const reservas = lista.filter(Boolean).map(r => ({ id: r.id, barbeiro: r.barbeiro, servico: r.servico, extras: r.extras || [], total: r.total, data: r.data, hora: r.hora, nome: r.nome }));
    // ids que não existem mais (desmarcados pela barbearia ou já passados) o aparelho pode esquecer
    const validos = new Set(reservas.map(r => r.id));
    return json({ reservas: reservas.filter(r => r.data >= hoje).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)), esquecer: itens.map(i => i && i.id).filter(id => !validos.has(id)) });
  } catch (e) {
    console.error('meus', e);
    return json({ erro: 'Não foi possível carregar seus horários.' }, 500);
  }
}
