import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
import { z } from "zod";
import { AppError, httpStatus, toActionError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireViewer } from "@/server/session";
import { AI_TOOLS, assertAiAllowed, reserveAiUsage, settleAiUsage, systemPromptFor, type AiTool } from "@/server/services/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  tool: z.enum(Object.keys(AI_TOOLS) as [AiTool, ...AiTool[]]),
  messages: z.array(z.any()).min(1).max(30),
});

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    await enforceRateLimit(`ai:${viewer.id}`, 6, 60);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION", "Requisição inválida.");
    const messages = parsed.data.messages as UIMessage[];
    // Limita o tamanho do contexto enviado ao modelo (custo e abuso).
    const totalChars = JSON.stringify(messages).length;
    if (totalChars > 24_000) throw new AppError("VALIDATION", "A conversa ficou longa demais. Comece uma nova.");
    const cfg = await assertAiAllowed(viewer.id);

    const MAX_OUTPUT = 1200;
    const usageId = await reserveAiUsage({
      userId: viewer.id,
      feature: parsed.data.tool,
      model: cfg.modelId,
      estimatedInput: Math.ceil(totalChars / 3),
      maxOutput: MAX_OUTPUT,
    });

    const result = streamText({
      model: cfg.model!,
      system: systemPromptFor(parsed.data.tool),
      messages: await convertToModelMessages(messages),
      maxOutputTokens: MAX_OUTPUT,
      abortSignal: req.signal,
      onEnd: async (event) => {
        await settleAiUsage(usageId, {
          inputTokens: event.totalUsage.inputTokens ?? 0,
          outputTokens: event.totalUsage.outputTokens ?? 0,
          status: "ok",
        });
      },
      onError: async () => {
        await settleAiUsage(usageId, { inputTokens: 0, outputTokens: 0, status: "error" });
      },
      // Abortado pelo cliente: a reserva (pior caso) permanece contando na cota e no custo.
    });
    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  } catch (err) {
    const e = toActionError(err);
    return Response.json(e, { status: httpStatus(e.code) });
  }
}
