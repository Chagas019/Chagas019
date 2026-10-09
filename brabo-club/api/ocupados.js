// Horários já reservados (só os códigos dos horários, sem dados de clientes)
import { json, idsOcupados } from './_lib/dados.js';

export async function GET() {
  try {
    return json({ ocupados: await idsOcupados() }, 200, 'public, s-maxage=10, stale-while-revalidate=30');
  } catch (e) {
    console.error('ocupados', e);
    return json({ erro: 'Não foi possível carregar a agenda.' }, 500);
  }
}
