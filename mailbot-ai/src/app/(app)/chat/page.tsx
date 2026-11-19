import { ChatView } from '@/components/ChatView';
import { pageContext } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

export default async function Chat({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { sb, account } = await pageContext();
  let initial: { role: 'user' | 'assistant'; content: string; agent: string | null; refs: [] }[] = [];
  let conversationId: string | undefined;
  if (c && /^[0-9a-f-]{36}$/.test(c)) {
    const { data } = await sb.from('ai_conversation_messages').select('role,content,agent,refs').eq('conversation_id', c).order('created_at').limit(100);
    if (data?.length) { initial = data as typeof initial; conversationId = c; }
  }
  return (
    <div className="page">
      <div className="topbar"><h1>Chat AI</h1>{conversationId && <a href="/chat" className="btn btn-ghost btn-sm">Nova conversa</a>}</div>
      <ChatView initial={initial} conversationId={conversationId} connected={account?.status === 'connected'} />
    </div>
  );
}
