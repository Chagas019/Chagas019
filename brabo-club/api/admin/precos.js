// Dono: salva a tabela de preços
import { json, autorizado, validarPrecos, salvarPrecos } from '../_lib/dados.js';

export async function PUT(request) {
  if (!autorizado(request)) return json({ erro: 'Chave inválida.' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'Envio inválido.' }, 400); }
  const v = validarPrecos(body && body.servicos);
  if (v.erro) return json({ erro: v.erro }, 400);
  try {
    await salvarPrecos(v.servicos);
    return json({ ok: true, servicos: v.servicos });
  } catch (e) {
    console.error('admin precos', e);
    return json({ erro: 'Não foi possível salvar agora.' }, 500);
  }
}
