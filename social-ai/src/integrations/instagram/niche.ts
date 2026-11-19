import { z } from 'zod';
import { getDb } from '../../db/db.js';
import { getActiveAccount, updateBrand } from '../../db/repo.js';
import { getLLM } from '../llm/provider.js';
import { graphClientFor } from './account.js';
import { PermanentError } from '../../lib/errors.js';

export const NICHES = [
  'Fotografia mobile', 'Criação de conteúdo', 'Fotografia e audiovisual', 'Edição de fotos e vídeos',
  'Comunicação visual', 'Tutoriais de aplicativos', 'Criatividade e tecnologia', 'Conteúdo de inspiração e educação',
];

const NicheSchema = z.object({
  niche: z.string(),
  confidence: z.number().min(0).max(1),
  audience: z.string(),
  reasoning: z.string(),
});

/** Analisa bio e publicações recentes do perfil conectado e sugere um nicho (o admin confirma ou altera). */
export async function analyzeNiche() {
  const acc = getActiveAccount();
  if (!acc) throw new PermanentError('Conecte a conta do Instagram primeiro.');
  const client = graphClientFor(acc);
  const profile: any = await client.account(acc.ig_user_id);
  const media = await client.ownMedia(acc.ig_user_id, 20);
  const res = await getLLM().json({
    system: 'Você classifica perfis de Instagram em nichos editoriais. Responda com base apenas nos dados fornecidos.',
    schema: NicheSchema,
    prompt: `Nichos possíveis (escolha um ou proponha variação próxima): ${NICHES.join('; ')}.
Bio: ${profile.biography ?? ''}
Nome: ${profile.name ?? ''} (@${profile.username})
Primeiras linhas das últimas publicações: ${JSON.stringify((media.data ?? []).map((m: any) => (m.caption ?? '').split('\n')[0].slice(0, 120)))}`,
  });
  getDb().run(`UPDATE instagram_accounts SET niche_suggestion = ? WHERE id = ?`, JSON.stringify(res.data), acc.id);
  return res.data;
}

export function confirmNiche(niche: string, audience?: string) {
  const acc = getActiveAccount();
  if (!acc) throw new PermanentError('Nenhuma conta conectada.');
  getDb().run(`UPDATE instagram_accounts SET niche = ?, niche_confirmed = 1 WHERE id = ?`, niche, acc.id);
  updateBrand({ niche, ...(audience ? { audience } : {}), handle: acc.username ?? undefined });
  return { niche };
}
