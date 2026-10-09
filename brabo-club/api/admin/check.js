// Confere a chave do dono
import { json, autorizado } from '../_lib/dados.js';

export async function GET(request) {
  return autorizado(request) ? json({ ok: true }) : json({ erro: 'Chave inválida.' }, 401);
}
