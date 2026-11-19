import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dispatch } from '@/lib/agents/dispatch';
import { handle, HttpError, llmFor, rateLimit, repo, requireUser } from '@/lib/server/context';

export const maxDuration = 60;

const Body = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1000),
});

export function POST(req: Request) {
  return handle('chat', async () => {
    const user = await requireUser();
    await rateLimit(`chat:${user.id}`, 20, 60);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'Mensagem inválida (1 a 1000 caracteres).');
    const { message } = parsed.data;
    const r = repo();

    let conversationId = parsed.data.conversationId;
    if (conversationId && (await r.conversationOwner(conversationId)) !== user.id) throw new HttpError(404, 'Conversa não encontrada.');
    const history = conversationId ? await r.recentMessages(conversationId, 6) : [];
    conversationId ??= await r.createConversation(user.id, message);

    await r.appendMessage({ conversation_id: conversationId, user_id: user.id, role: 'user', content: message });
    const result = await dispatch(r, llmFor(r), user.id, message, history);
    await r.appendMessage({
      conversation_id: conversationId, user_id: user.id, role: 'assistant', content: result.answer,
      agent: result.agent, route: result.intent, refs: result.refs,
    });
    return NextResponse.json({ conversationId, ...result });
  });
}
