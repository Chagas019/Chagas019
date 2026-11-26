import { NextResponse, type NextRequest } from "next/server";
import { BriefSchema } from "@/lib/ai/schema";
import { generateOutline, AssistantError } from "@/lib/ai/assistant";
import { buildTemplateOutline } from "@/lib/ai/template";
import { integrationStatus, serverEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";

export const maxDuration = 300;
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida." }, { status: 400 }); }
  const parsed = BriefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Confira os campos: o tema precisa ter ao menos 3 caracteres." }, { status: 400 });
  const brief = parsed.data;
  const mode = (body as { modo?: string }).modo;
  const status = integrationStatus();

  if (mode === "modelo" || !status.ai) {
    return NextResponse.json({ mode: "modelo", reason: status.ai ? null : "ia-nao-configurada", outline: buildTemplateOutline(brief) });
  }

  let refund: (() => Promise<unknown>) | null = null;
  if (status.supabase) {
    const { sb, user } = await getCurrentUser();
    if (!sb || !user) return NextResponse.json({ error: "Entre na sua conta para usar o assistente de IA.", code: "login" }, { status: 401 });
    const { data, error } = await sb.rpc("consume_ai_credit", { free_limit: serverEnv.freeAiLimit });
    if (error) return NextResponse.json({ error: "Não foi possível verificar seu limite de uso." }, { status: 500 });
    if (data === -1) return NextResponse.json({ error: `Você usou as ${serverEnv.freeAiLimit} gerações de IA do plano gratuito neste mês. O roteiro-base continua disponível.`, code: "limite-plano" }, { status: 402 });
    if (!allow("assistant-user", user.id, 5, 60_000)) return NextResponse.json({ error: "Muitas gerações seguidas. Aguarde um minuto.", code: "limite" }, { status: 429 });
    refund = async () => sb.rpc("refund_ai_credit");
  } else if (!allow("assistant-anon", clientIp(req), 5, 3_600_000)) {
    return NextResponse.json({ error: "Limite de 5 gerações por hora atingido neste servidor de demonstração.", code: "limite" }, { status: 429 });
  }

  try {
    const outline = await generateOutline(brief);
    return NextResponse.json({ mode: "ia", outline });
  } catch (e) {
    await refund?.().catch(() => {}); // falha na geração não consome crédito
    if (e instanceof AssistantError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("assistant", e);
    return NextResponse.json({ error: "Erro inesperado ao gerar o roteiro." }, { status: 500 });
  }
}
