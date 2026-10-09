// Cliente reserva um horário
import { json, lerPrecos, validarPedido, criarReserva } from './_lib/dados.js';

export async function POST(request) {
  let pedido;
  try { pedido = await request.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }
  try {
    const v = validarPedido(pedido, await lerPrecos());
    if (v.erro) return json({ erro: v.erro }, 400);
    const r = await criarReserva(v.id, v.reserva);
    if (r === 'ocupado') return json({ erro: 'Esse horário acabou de ser reservado. Escolha outro.', ocupado: v.id }, 409);
    return json({ ok: true, id: v.id, total: v.reserva.total }, 201);
  } catch (e) {
    console.error('agendar', e);
    return json({ erro: 'Não foi possível reservar agora. Tente de novo em instantes.' }, 500);
  }
}
