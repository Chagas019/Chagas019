import { z } from 'zod';
import { getDb, json } from '../db/db.js';
import { getSetting } from '../db/repo.js';
import { getLLM } from './llm/provider.js';
import { logger } from '../lib/logger.js';

/**
 * Liturgia diária para perfis católicos.
 * Busca apenas REFERÊNCIAS (leituras, salmo, Evangelho), o refrão do salmo, a celebração e o santo do dia
 * em fontes oficiais/confiáveis (Canção Nova, CNBB, Vatican News) pela pesquisa web oficial do Claude,
 * restrita a esses domínios. Não copia o texto integral das leituras (direitos autorais da tradução).
 * Se as fontes não confirmarem a data, os campos ficam vazios — nada é inventado.
 */
const LiturgySchema = z.object({
  date_confirmed: z.boolean(),
  celebration: z.string().nullable(),
  liturgical_season: z.string().nullable(),
  liturgical_color: z.string().nullable(),
  first_reading: z.string().nullable(),
  psalm: z.string().nullable(),
  psalm_refrain: z.string().nullable(),
  second_reading: z.string().nullable(),
  gospel: z.string().nullable(),
  saint_of_day: z.string().nullable(),
  confidence: z.enum(['alta', 'media', 'baixa']),
});
export type Liturgy = z.infer<typeof LiturgySchema> & { date: string; sources: string[] };

export function getStoredLiturgy(date: string): Liturgy | null {
  const r = getDb().get('SELECT * FROM liturgy_days WHERE date = ?', date);
  if (!r) return null;
  return {
    date, date_confirmed: true, celebration: r.celebration, liturgical_season: r.liturgical_season, liturgical_color: r.liturgical_color,
    first_reading: r.first_reading, psalm: r.psalm, psalm_refrain: r.psalm_refrain, second_reading: r.second_reading,
    gospel: r.gospel, saint_of_day: r.saint_of_day, confidence: r.confidence, sources: json.parse(r.sources, []),
  };
}

export async function fetchLiturgy(date: string, addUsage?: (u: { input: number; output: number }) => void): Promise<Liturgy | null> {
  const cfg = getSetting('liturgy');
  if (!cfg?.enabled) return null;
  const cached = getStoredLiturgy(date);
  if (cached) return cached;
  const res = await getLLM().json({
    system: 'Você consulta a liturgia diária da Igreja Católica no Brasil. Responda somente com o que as fontes mostrarem para a data pedida. Nunca complete de memória.',
    schema: LiturgySchema,
    webSearch: { maxUses: 4, allowedDomains: cfg.domains },
    prompt: `Data: ${date} (calendário litúrgico do Brasil).
Encontre nas fontes oficiais a liturgia desta data e informe apenas:
- celebração do dia, tempo litúrgico e cor litúrgica;
- REFERÊNCIAS da 1ª leitura, do salmo, da 2ª leitura (só domingos/solenidades) e do Evangelho (ex.: "Lc 11,15-26");
- o refrão do salmo (frase curta, como está na fonte, sem o "R.");
- o santo do dia.
Não transcreva os textos das leituras. Se a página não confirmar a data ${date}, marque date_confirmed=false e deixe os campos nulos.`,
  });
  addUsage?.(res.usage);
  const d = res.data;
  if (!d.date_confirmed || !d.gospel) {
    logger.warn(`Liturgia de ${date} não confirmada pelas fontes — não será usada`, { sources: res.sources });
    return null;
  }
  getDb().run(
    `INSERT OR REPLACE INTO liturgy_days (date, celebration, liturgical_season, liturgical_color, first_reading, psalm, psalm_refrain, second_reading, gospel, saint_of_day, sources, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    date, d.celebration, d.liturgical_season, d.liturgical_color, d.first_reading, d.psalm, d.psalm_refrain, d.second_reading,
    d.gospel, d.saint_of_day, JSON.stringify(res.sources.slice(0, 5)), d.confidence,
  );
  return { ...d, date, sources: res.sources };
}

/** Bloco de contexto para os prompts dos agentes. */
export function liturgyContext(l: Liturgy | null) {
  if (!l) return '';
  return `LITURGIA DO DIA (fonte: ${l.sources[0] ?? 'oficial'}): ${[
    l.celebration && `celebração: ${l.celebration}`,
    l.liturgical_season && `tempo: ${l.liturgical_season}`,
    l.liturgical_color && `cor: ${l.liturgical_color}`,
    l.first_reading && `1ª leitura: ${l.first_reading}`,
    l.psalm && `salmo: ${l.psalm}`,
    l.psalm_refrain && `refrão: "${l.psalm_refrain}"`,
    l.second_reading && `2ª leitura: ${l.second_reading}`,
    l.gospel && `Evangelho: ${l.gospel}`,
    l.saint_of_day && `santo do dia: ${l.saint_of_day}`,
  ].filter(Boolean).join('; ')}.
Use exatamente estas referências; não invente outras. Ao citar um versículo, cite no máximo um trecho curto e sempre com a referência.`;
}
