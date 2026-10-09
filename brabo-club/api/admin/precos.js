// Salva a tabela de preços: o dono muda tudo; o barbeiro muda só os preços dele
import { json, quem, lerPrecos, validarPrecos, validarPrecosBarbeiro, salvarPrecos } from '../_lib/dados.js';

export async function PUT(request) {
  const q = quem(request);
  if (!q) return json({ erro: 'Chave inválida.' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'Envio inválido.' }, 400); }
  try {
    const v = q.papel === 'dono'
      ? validarPrecos(body && body.servicos)
      : validarPrecosBarbeiro(body && body.servicos, await lerPrecos(), q.barbeiro);
    if (v.erro) return json({ erro: v.erro }, 400);
    await salvarPrecos(v.servicos);
    return json({ ok: true, servicos: v.servicos });
  } catch (e) {
    console.error('admin precos', e);
    return json({ erro: 'Não foi possível salvar agora.' }, 500);
  }
}
