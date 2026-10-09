// Tabela de preços pública (lida pelo site dos clientes)
import { json, lerPrecos } from './_lib/dados.js';

export async function GET() {
  try {
    return json({ servicos: await lerPrecos() }, 200, 'public, s-maxage=20, stale-while-revalidate=120');
  } catch (e) {
    console.error('precos', e);
    return json({ erro: 'Não foi possível carregar os preços.' }, 500);
  }
}
