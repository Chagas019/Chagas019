// Cliente desmarca a própria reserva (precisa do código que ficou no aparelho dele)
import { json, reservaDoCliente, apagarReserva, agoraSP } from './_lib/dados.js';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'Pedido inválido.' }, 400); }
  try {
    const r = await reservaDoCliente(body && body.id, body && body.codigo);
    if (!r) return json({ erro: 'Não encontramos esse horário. Fale com a barbearia.' }, 404);
    const agora = agoraSP();
    if (r.data < agora.data || (r.data === agora.data && r.hora <= agora.hora)) return json({ erro: 'Esse horário já passou.' }, 400);
    await apagarReserva(r.id);
    return json({ ok: true });
  } catch (e) {
    console.error('desmarcar', e);
    return json({ erro: 'Não foi possível desmarcar agora. Tente de novo.' }, 500);
  }
}
