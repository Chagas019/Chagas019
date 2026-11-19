import crypto from "node:crypto";
import { Product } from "@prisma/client";
import { prisma, logEvent, errMsg } from "../../lib/core";
import { incr } from "../../lib/metrics";
import { env } from "../../config/env";
import { getLlm, LlmUnavailableError } from "../../integrations/ai/llm";
import { runAgentTask } from "../runtime";
import { transition } from "../../orchestrator/states";
import { brl, buildMessage } from "./message";
import { validateCreative, validateMessage } from "./validator";

export const COPY_PROMPT_VERSION = "copy-v1";
export const COPY_IDENTITY = "Especialista em marketing de performance e copywriting para e-commerce.";
export const COPY_SYSTEM_PROMPT = `Você é o COPYWRITER AI da OFERTA AI, especialista em marketing de performance e copywriting para e-commerce no Brasil.
Você escreve APENAS dois campos para uma oferta da Shopee:
- headline: título chamativo, até 70 caracteres, pode ter no máximo 1 emoji.
- description: 1 a 2 frases curtas (até 280 caracteres) destacando benefícios reais e plausíveis do TIPO de produto, adaptadas à categoria.

REGRAS OBRIGATÓRIAS:
- Não escreva números de nenhum tipo (preços, porcentagens, notas, vendas, quantidades, medidas). Esses dados são inseridos automaticamente pelo sistema.
- Não invente descontos, avaliações, vendas, garantias, frete grátis, brindes, certificações ou características técnicas que não estejam no nome do produto.
- Não use urgência falsa (ex.: "últimas unidades", "só hoje", "corra", "tempo limitado", "acaba em").
- Não afirme "mais vendido", "nº 1", "melhor do Brasil" ou similares.
- Não inclua links.
- Use português brasileiro natural, emojis com equilíbrio (no máximo 2 no total).
- Cada copy deve ser única: varie a abordagem (praticidade, conforto, economia de tempo, presente, organização, estilo...).`;

const SCHEMA = {
  type: "object",
  properties: { headline: { type: "string" }, description: { type: "string" } },
  required: ["headline", "description"],
  additionalProperties: false,
};

const OPENERS = ["Achado do dia", "Vale a pena conferir", "Oferta selecionada", "Para facilitar sua rotina", "Boa escolha para você", "Seleção OFERTA AI"];
const BENEFITS: Record<string, string[]> = {
  default: ["Uma opção prática para o dia a dia.", "Feito para facilitar a sua rotina.", "Ótimo para usar em casa ou presentear."],
  "Eletrônicos": ["Mais praticidade para o seu dia conectado.", "Tecnologia útil para a rotina."],
  "Cozinha": ["Deixa o preparo das refeições mais prático.", "Ajuda a organizar e agilizar a cozinha."],
  "Casa e Decoração": ["Deixa o ambiente mais organizado e agradável.", "Um toque prático para a sua casa."],
  "Beleza": ["Para incluir no seu ritual de cuidados.", "Cuidado pessoal com mais praticidade."],
  "Pet": ["Mais conforto e diversão para o seu pet.", "Pensado para a rotina do seu bichinho."],
  "Esportes": ["Um aliado para a sua rotina de treinos.", "Para treinar com mais praticidade."],
};

function pick<T>(arr: T[], seed: string): T {
  const h = crypto.createHash("md5").update(seed).digest().readUInt32BE(0);
  return arr[h % arr.length];
}

/** Copy determinística (sem IA) baseada apenas em dados reais. */
export function templateCreative(p: Pick<Product, "id" | "name" | "category" | "rating" | "sales">) {
  const headline = `${pick(OPENERS, p.id)}: ${p.category}`;
  const parts = [pick(BENEFITS[p.category] ?? BENEFITS.default, p.id + "b")];
  if (p.rating !== null && p.rating >= 4.5) parts.push("Bem avaliado por quem já comprou.");
  if (p.sales !== null && p.sales >= 1000) parts.push("Muito procurado na Shopee.");
  return { headline, description: parts.join(" ") };
}

function productBrief(p: Product): string {
  const lines = [
    `Nome do produto: ${p.name}`,
    `Categoria: ${p.category}`,
    p.keyword ? `Busca de origem: ${p.keyword}` : null,
    p.shopName ? `Loja: ${p.shopName}` : null,
    p.rating !== null ? `Avaliação disponível: sim (alta: ${p.rating >= 4.5 ? "sim" : "não"})` : "Avaliação disponível: não",
    p.sales !== null ? `Vendas disponíveis: sim (muitas: ${p.sales >= 1000 ? "sim" : "não"})` : "Vendas disponíveis: não",
    p.discountRate ? "Há desconto comprovado: sim" : "Há desconto comprovado: não",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function trackedLink(productId: string): Promise<string> {
  const link = await prisma.affiliateLink.findFirst({ where: { productId }, orderBy: { createdAt: "desc" } });
  if (!link) throw new Error("produto sem link de afiliado");
  // Se houver URL pública configurada, usa o redirecionador próprio para contar cliques reais
  return env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/r/${link.trackCode}` : link.url;
}

export async function generateCopy(productId: string): Promise<{ copyId: string; model: string } | null> {
  return runAgentTask(
    "COPYWRITER",
    "gerar copy",
    { productId },
    async () => {
      const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      if (p.state !== "APPROVED") return { output: null as never, status: "SKIPPED" };
      if (p.currentPrice === null) throw new Error("produto sem preço");

      const link = await trackedLink(p.id);
      const currentPrice = Number(p.currentPrice);
      const originalPrice = p.originalPrice !== null && p.discountSource ? Number(p.originalPrice) : null;

      let creative: { headline: string; description: string } | null = null;
      let model = "template";
      let errors: string[] = [];
      const llm = await getLlm();
      if (llm) {
        let feedback = "";
        for (let attempt = 0; attempt < 2 && !creative; attempt++) {
          try {
            const r = await llm.json<{ headline: string; description: string }>({
              system: COPY_SYSTEM_PROMPT,
              user: `${productBrief(p)}${feedback}`,
              schema: SCHEMA,
            });
            errors = validateCreative(r.data);
            if (!errors.length) {
              creative = r.data;
              model = r.model;
            } else feedback = `\n\nSua resposta anterior foi rejeitada pelo validador: ${errors.join("; ")}. Corrija.`;
          } catch (err) {
            await logEvent("warn", "copywriter", `IA indisponível, usando template: ${errMsg(err)}`);
            if (err instanceof LlmUnavailableError) break;
          }
        }
      }
      if (!creative) {
        creative = templateCreative(p);
        model = "template";
        errors = validateCreative(creative);
      }

      const message = buildMessage({ name: p.name, currentPrice, originalPrice, rating: p.rating, sales: p.sales, link, ...creative });
      const msgErrors = validateMessage(message, {
        link,
        priceText: brl(currentPrice),
        originalPriceText: originalPrice !== null && originalPrice > currentPrice ? brl(originalPrice) : null,
      });
      const allErrors = [...errors, ...msgErrors];
      const copy = await prisma.generatedCopy.create({
        data: {
          productId: p.id,
          headline: creative.headline,
          description: creative.description,
          message,
          model,
          promptVersion: COPY_PROMPT_VERSION,
          valid: allErrors.length === 0,
          validationErrors: allErrors,
        },
      });
      await incr("copiesGenerated");
      await transition(p.id, "APPROVED", "COPY_GENERATED", "copywriter", `copy ${copy.id} (${model})`);

      // Validação final (Orchestrator): só libera para publicação se a copy for válida
      if (allErrors.length) {
        await transition(p.id, "COPY_GENERATED", "REJECTED", "orchestrator", `copy inválida: ${allErrors.join("; ")}`, {
          rejectionReason: `copy inválida: ${allErrors.join("; ")}`,
        });
      } else {
        await transition(p.id, "COPY_GENERATED", "READY_TO_PUBLISH", "orchestrator", "validação final aprovada");
      }
      return { output: { copyId: copy.id, model }, model };
    },
    { taskKey: `copy:${productId}:${new Date().toISOString().slice(0, 13)}` },
  );
}
