import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { IdeaOutputSchema, IdeaRequestSchema } from "@/lib/ideas/schema";
import { generateLocalIdea } from "@/lib/ideas/local-engine";
import type { GeneratedIdea } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Limite simples por IP (memória da instância) para proteger a chave de uso abusivo. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

const SYSTEM = `Você é o diretor criativo do CRIATIVA LAB, uma academia de criatividade.
Gere UMA proposta criativa original, prática e específica em português do Brasil.
Evite clichês e ideias genéricas; prefira decisões concretas (o que fotografar, que cor, que corte, que palavra).
- "ideas": 4 ideias originais e distintas, cada uma em 1–2 frases.
- "artDirection": um parágrafo com luz, composição, tipografia, textura e cenário.
- "references": 3 a 4 referências de estilos, movimentos, técnicas ou tipos de obra (sem inventar obras específicas).
- "palette": 4 ou 5 cores com nome evocativo e hex no formato #RRGGBB.
- "execution": 4 a 6 passos práticos adequados ao nível de dificuldade.
- "script": se o projeto envolver vídeo, animação, reels ou narrativa temporal, um roteiro com 5 a 7 linhas no formato "tempo · ação"; caso contrário, null.`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const parsed = IdeaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const input = parsed.data;
  const salt = typeof (body as { salt?: unknown }).salt === "number" ? (body as { salt: number }).salt : 0;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ idea: generateLocalIdea(input, salt), notice: "Motor criativo local (configure ANTHROPIC_API_KEY para usar IA)." });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) {
    return NextResponse.json({ idea: generateLocalIdea(input, salt), notice: "Muitas gerações seguidas — usando o motor local por um minuto." });
  }

  try {
    const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(IdeaOutputSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `O que deseja criar: ${input.what}`,
            `Categoria: ${input.category}`,
            `Estilo visual: ${input.style}`,
            `Público-alvo: ${input.audience}`,
            `Nível de dificuldade: ${input.difficulty}`,
            input.extra ? `Observações: ${input.extra}` : "",
            salt ? `Variação nº ${salt}: traga um caminho diferente das anteriores.` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ idea: generateLocalIdea(input, salt), notice: "A IA não pôde responder a este pedido — usamos o motor local." });
    }

    const out = response.parsed_output;
    const idea: GeneratedIdea = {
      ...out,
      palette: out.palette.filter((p) => /^#[0-9a-f]{6}$/i.test(p.hex)).slice(0, 6),
      source: "ia",
    };
    return NextResponse.json({ idea });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("[ideas] Chave da Anthropic inválida.");
    else if (err instanceof Anthropic.RateLimitError) console.warn("[ideas] Limite de taxa da API atingido.");
    else if (err instanceof Anthropic.APIError) console.error("[ideas] Erro da API:", err.status, err.message);
    else console.error("[ideas] Falha inesperada:", err);
    return NextResponse.json({ idea: generateLocalIdea(input, salt), notice: "A IA está indisponível agora — usamos o motor local." });
  }
}
