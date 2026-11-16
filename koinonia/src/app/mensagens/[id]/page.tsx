import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { listMyConversations } from "@/services/messaging";
import { uuidSchema } from "@/schemas/common";
import { blockUserAction } from "@/features/messaging/actions";
import { MessageComposer } from "@/features/messaging/components/message-composer";
import { Alert, Avatar, Button } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { AutoRefresh } from "@/components/features/auto-refresh";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.messages.title, robots: { index: false } };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { m, locale }] = await Promise.all([params, getI18n()]);
  if (!uuidSchema.safeParse(id).success) notFound();
  const session = await requireSession(`/mensagens/${id}`);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;

  const conversations = await listMyConversations(supabase);
  const conv = conversations.find((c) => c.conversation_id === id);
  if (!conv) notFound();
  const [{ data: rows }, { data: myBlock }] = await Promise.all([
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", session.userId).eq("blocked_id", conv.other_id).maybeSingle(),
    supabase.rpc("mark_conversation_read", { p_conversation: id }),
  ]);
  const messages = [...(rows ?? [])].reverse() as Array<{ id: string; sender_id: string; body: string; created_at: string }>;
  const time = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const back = `/mensagens/${id}`;

  return (
    <Container size="md" className="py-8">
      <AutoRefresh />
      <Link href="/mensagens" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink"><ArrowLeft aria-hidden className="size-4" />{m.messages.back}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h1 className="flex items-center gap-3 font-display text-2xl font-semibold">
          <Avatar name={conv.other_name || "?"} src={conv.other_avatar} size="sm" />
          <span>{t(m.messages.conversationWith, { name: conv.other_name || "—" })}</span>
        </h1>
        <form action={blockUserAction}>
          <input type="hidden" name="userId" value={conv.other_id} />
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="mode" value={myBlock ? "unblock" : "block"} />
          <Button type="submit" size="sm" variant="ghost">{myBlock ? m.messages.unblock : m.messages.block}</Button>
        </form>
      </div>

      <ol aria-label={m.messages.title} className="my-6 flex flex-col gap-3">
        {messages.map((msg) => {
          const mine = msg.sender_id === session.userId;
          return (
            <li key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-soft sm:max-w-[70%]", mine ? "rounded-br-sm bg-navy-900 text-white" : "rounded-bl-sm border border-border bg-surface text-ink")}>
                <p className="sr-only">{mine ? m.messages.you : conv.other_name}:</p>
                <p className="leading-relaxed break-words whitespace-pre-line">{msg.body}</p>
                <p className={cn("mt-1 text-[0.7rem]", mine ? "text-navy-200" : "text-ink-subtle")}><time dateTime={msg.created_at}>{time.format(new Date(msg.created_at))}</time></p>
              </div>
            </li>
          );
        })}
      </ol>

      {myBlock ? <Alert tone="warning">{m.messages.blockedNotice}</Alert> : (
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-canvas/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
          <MessageComposer conversationId={id} labels={{ label: m.messages.label, placeholder: m.messages.placeholder, send: m.messages.send, sending: m.common.saving }} />
        </div>
      )}
    </Container>
  );
}
