// Dono vê e cancela todos os agendamentos; cada barbeiro só os dele
import { json, quem, reservasFuturas, apagarReserva } from '../_lib/dados.js';

export async function GET(request) {
  const q = quem(request);
  if (!q) return json({ erro: 'Chave inválida.' }, 401);
  try {
    let reservas = await reservasFuturas();
    if (q.papel === 'barbeiro') reservas = reservas.filter(r => r.barbeiro === q.barbeiro);
    return json({ reservas });
  } catch (e) {
    console.error('admin reservas', e);
    return json({ erro: 'Não foi possível carregar os agendamentos.' }, 500);
  }
}

export async function DELETE(request) {
  const q = quem(request);
  if (!q) return json({ erro: 'Chave inválida.' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (q.papel === 'barbeiro' && !id.startsWith(q.barbeiro + '_')) return json({ erro: 'Esse horário é de outro barbeiro.' }, 403);
  try {
    return (await apagarReserva(id)) ? json({ ok: true }) : json({ erro: 'Agendamento inválido.' }, 400);
  } catch (e) {
    console.error('admin cancelar', e);
    return json({ erro: 'Não foi possível cancelar agora.' }, 500);
  }
}
