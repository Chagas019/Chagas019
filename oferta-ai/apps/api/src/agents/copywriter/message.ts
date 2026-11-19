/**
 * Montagem da mensagem final. Preços, avaliação, vendas e link vêm SEMPRE dos dados do produto —
 * a IA escreve apenas o título chamativo e a descrição. Linhas sem dado disponível são omitidas.
 */
export interface MessageData {
  name: string;
  currentPrice: number;
  originalPrice: number | null;
  rating: number | null;
  sales: number | null;
  link: string;
  headline: string;
  description: string;
}

export const DISCLAIMER_PRICE = "⚠️ Preços e disponibilidade podem mudar.";
export const DISCLAIMER_AFFILIATE = "Link de afiliado: podemos receber comissão pela compra, sem custo adicional para você.";

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/ /g, " ");
}

export function formatSales(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function buildMessage(d: MessageData): string {
  const lines: string[] = [];
  lines.push("🔥 OFERTA ENCONTRADA!");
  lines.push("");
  lines.push(`🎯 ${d.headline.trim()}`);
  lines.push(`📦 ${d.name.trim()}`);
  lines.push("");
  // "De" só aparece com preço original comprovado e maior que o atual
  if (d.originalPrice !== null && d.originalPrice > d.currentPrice + 0.009) {
    lines.push(`💰 De: ${brl(d.originalPrice)}`);
    lines.push(`🔥 Por apenas: ${brl(d.currentPrice)}`);
  } else {
    lines.push(`🔥 Por apenas: ${brl(d.currentPrice)}`);
  }
  if (d.rating !== null || d.sales !== null) lines.push("");
  if (d.rating !== null) lines.push(`⭐ Avaliação: ${d.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/5`);
  if (d.sales !== null) lines.push(`🛒 Vendas: ${formatSales(d.sales)}`);
  lines.push("");
  lines.push("DESCRIÇÃO:");
  lines.push(d.description.trim());
  lines.push("");
  lines.push("🛍️ COMPRE AQUI:");
  lines.push(d.link);
  lines.push("");
  lines.push(DISCLAIMER_PRICE);
  lines.push("");
  lines.push(DISCLAIMER_AFFILIATE);
  return lines.join("\n");
}
