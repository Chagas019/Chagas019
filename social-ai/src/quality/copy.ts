import type { Issue } from './visual.js';

/** Clichês e marcas de texto artificial que o Copywriter deve evitar. */
export const CLICHES = [
  'no mundo de hoje', 'nos dias de hoje', 'descubra o segredo', 'você não vai acreditar', 'confira', 'incrível dica',
  'mergulhe', 'desvende', 'eleve seu', 'eleve sua', 'potencialize', 'revolucion', 'jornada', 'sem mais delongas',
  'neste post', 'neste vídeo vamos', 'fique ligado', 'não perca', 'segredo que ninguém conta', 'game changer',
];
const GENERIC_TAGS = ['love', 'instagood', 'photooftheday', 'follow', 'like4like', 'followme', 'instadaily', 'tbt', 'f4f', 'l4l', 'seguidores'];

export function normalizeTag(t: string) {
  return t.replace(/^#/, '').trim().toLowerCase();
}

export function buildCaption(c: { hook?: string; body: string; cta?: string; hashtags: string[] }) {
  const tags = [...new Set(c.hashtags.map(normalizeTag).filter(Boolean))].map((t) => `#${t}`);
  return [c.hook, c.body, c.cta, tags.join(' ')].filter((x) => x && x.trim()).join('\n\n').trim();
}

export function checkCopy(
  c: { hook?: string; body: string; cta?: string; hashtags: string[]; fullText: string },
  rules: { maxHashtags: number; maxLength: number; forbidden: string[] },
): Issue[] {
  const issues: Issue[] = [];
  const text = c.fullText.toLowerCase();
  if (!c.body?.trim() || !c.fullText.trim()) issues.push({ code: 'empty_caption', severity: 'critical', message: 'Legenda vazia' });
  if (c.fullText.length > rules.maxLength) issues.push({ code: 'caption_length', severity: 'critical', message: `Legenda com ${c.fullText.length} caracteres (máx. ${rules.maxLength})` });
  const tags = (c.fullText.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(normalizeTag);
  if (tags.length > Math.min(30, rules.maxHashtags)) issues.push({ code: 'hashtags', severity: tags.length > 30 ? 'critical' : 'major', message: `${tags.length} hashtags (máx. ${rules.maxHashtags})` });
  if (new Set(tags).size !== tags.length) issues.push({ code: 'hashtag_dup', severity: 'minor', message: 'Hashtags duplicadas' });
  const generic = tags.filter((t) => GENERIC_TAGS.includes(t));
  if (generic.length) issues.push({ code: 'generic_tags', severity: 'minor', message: `Hashtags genéricas: ${generic.join(', ')}` });
  const mentions = (c.fullText.match(/@[\w.]+/g) ?? []).length;
  if (mentions > 20) issues.push({ code: 'mentions', severity: 'critical', message: 'Mais de 20 menções' });
  for (const w of rules.forbidden) if (w && text.includes(w.toLowerCase())) issues.push({ code: 'forbidden', severity: 'critical', message: `Termo proibido: "${w}"` });
  const cl = CLICHES.filter((x) => text.includes(x));
  if (cl.length) issues.push({ code: 'cliche', severity: cl.length > 2 ? 'major' : 'minor', message: `Clichês: ${cl.join(', ')}` });
  const emojis = (c.fullText.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojis > 8) issues.push({ code: 'emoji', severity: 'minor', message: `${emojis} emojis — excesso` });
  if (c.hook && c.hook.length > 140) issues.push({ code: 'hook_length', severity: 'minor', message: 'Gancho longo demais para os 3 primeiros segundos' });
  if (!c.cta?.trim()) issues.push({ code: 'no_cta', severity: 'minor', message: 'Sem CTA explícito' });
  return issues;
}
