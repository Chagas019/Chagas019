// Confere a chave: diz se é o dono ou qual barbeiro
import { json, quem } from '../_lib/dados.js';

export async function GET(request) {
  const q = quem(request);
  return q ? json({ ok: true, ...q }) : json({ erro: 'Chave inválida.' }, 401);
}
