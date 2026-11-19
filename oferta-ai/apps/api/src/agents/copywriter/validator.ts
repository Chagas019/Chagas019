import { DISCLAIMER_AFFILIATE, DISCLAIMER_PRICE } from "./message";

/**
 * Validação final da copy (Orchestrator só libera para publicação se válida).
 * Bloqueia: urgência falsa, números/descontos/avaliações inventados, texto longo, emoji em excesso.
 */
export const FALSE_URGENCY = [
  /últimas? unidades?/i,
  /s[oó] hoje/i,
  /acaba (hoje|em)/i,
  /corra/i,
  /antes que acabe/i,
  /tempo limitado/i,
  /por pouco tempo/i,
  /restam? (apenas|só)?\s*\d/i,
  /estoque (limitado|acabando)/i,
  /última chance/i,
  /oferta rel[aâ]mpago/i,
  /garanta j[aá]/i,
];

/** Afirmações que exigiriam dados que não temos. */
export const UNVERIFIABLE_CLAIMS = [/mais vendido/i, /n[ºo°]\s*1/i, /melhor do (brasil|mundo|mercado)/i, /garantia de \d/i, /frete gr[aá]tis/i, /produto original/i,/certificad[oa]/i];

const EMOJI = /\p{Extended_Pictographic}/gu;

export interface CopyInput {
  headline: string;
  description: string;
}

export function validateCreative(c: CopyInput): string[] {
  const errors: string[] = [];
  const text = `${c.headline}\n${c.description}`;
  if (!c.headline.trim()) errors.push("título vazio");
  if (!c.description.trim()) errors.push("descrição vazia");
  if (c.headline.length > 80) errors.push("título acima de 80 caracteres");
  if (c.description.length > 320) errors.push("descrição acima de 320 caracteres");
  // Nenhum número na copy criativa: preços, %, notas e vendas vêm só do bloco de dados
  if (/\d/.test(text)) errors.push("título/descrição contém números (preço, desconto, nota ou vendas devem vir apenas dos dados)");
  if (/R\$|reais|%|desconto de|estrelas?/i.test(text)) errors.push("título/descrição menciona preço/desconto/avaliação");
  if (/https?:\/\/|www\./i.test(text)) errors.push("título/descrição contém link");
  for (const re of FALSE_URGENCY) if (re.test(text)) errors.push(`urgência falsa: "${text.match(re)?.[0]}"`);
  for (const re of UNVERIFIABLE_CLAIMS) if (re.test(text)) errors.push(`afirmação não verificável: "${text.match(re)?.[0]}"`);
  const emojis = text.match(EMOJI)?.length ?? 0;
  if (emojis > 3) errors.push(`emojis em excesso (${emojis})`);
  return errors;
}

export function validateMessage(message: string, expected: { link: string; priceText: string; originalPriceText: string | null }): string[] {
  const errors: string[] = [];
  if (!message.includes(expected.link)) errors.push("link de afiliado ausente");
  if (!message.includes(expected.priceText)) errors.push("preço atual divergente");
  if (expected.originalPriceText === null && /De: R\$/.test(message)) errors.push("preço 'De' sem comprovação");
  if (!message.includes(DISCLAIMER_PRICE)) errors.push("aviso de preço ausente");
  if (!message.includes(DISCLAIMER_AFFILIATE)) errors.push("aviso de afiliado ausente");
  if (message.length > 1500) errors.push("mensagem longa demais");
  return errors;
}
