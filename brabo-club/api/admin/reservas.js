// Dono: lista e cancela agendamentos
import { json, autorizado, reservasFuturas, apagarReserva } from '../_lib/dados.js';

export async function GET(request) {
  if (!autorizado(request)) return json({ erro: 'Chave inválida.' }, 401);
  try {
    return json({ reservas: await reservasFuturas() });
  } catch (e) {
    console.error('admin reservas', e);
    return json({ erro: 'Não foi possível carregar os agendamentos.' }, 500);
  }
}

export async function DELETE(request) {
  if (!autorizado(request)) return json({ erro: 'Chave inválida.' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  try {
    return (await apagarReserva(id)) ? json({ ok: true }) : json({ erro: 'Agendamento inválido.' }, 400);
  } catch (e) {
    console.error('admin cancelar', e);
    return json({ erro: 'Não foi possível cancelar agora.' }, 500);
  }
}
