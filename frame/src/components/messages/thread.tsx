"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { fetchMessagesAction, leaveConversationAction, sendMessageAction } from "@/server/actions/messages";
import { cn, timeAgo } from "@/lib/utils";

export type ThreadMessage = { id: string; senderId: string | null; body: string; createdAt: Date; sharedPostId: string | null; sharedPostTitle: string | null };
type Member = { userId: string; handle: string; displayName: string };

const POLL_MS = 5000;

/** Linkifica apenas trabalhos do próprio FRAME (/p/<id>); o resto é texto puro (sem HTML). */
function Body({ text }: { text: string }) {
  const parts = text.split(/(\/p\/[0-9a-f-]{36})/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\/p\/[0-9a-f-]{36}$/i.test(p) ? (
          <Link key={i} href={p} className="underline underline-offset-2">
            ver trabalho
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Thread({ conversationId, viewerId, members, initial, blocked: initialBlocked }: { conversationId: string; viewerId: string; members: Member[]; initial: ThreadMessage[]; blocked: boolean }) {
  const [items, setItems] = useState(initial);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  const names = new Map(members.map((m) => [m.userId, m.displayName]));

  const lastIso = items.length ? new Date(items[items.length - 1]!.createdAt).toISOString() : null;
  const poll = useCallback(async () => {
    const r = await fetchMessagesAction(conversationId, lastIso);
    if (!r.ok) return;
    setBlocked(r.data.blocked);
    if (r.data.messages.length) {
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return prev.concat(r.data.messages.filter((m) => !seen.has(m.id)));
      });
    }
  }, [conversationId, lastIso]);

  useEffect(() => {
    // Atualização periódica (sem infraestrutura de tempo real); pausa com a aba oculta.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items.length]);

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[420px] flex-col rounded-[var(--radius-lg)] bg-ink-850">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {items.map((m) => {
          const mine = m.senderId === viewerId;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              {!mine && members.length > 2 ? <span className="mb-0.5 text-xs text-fog-500">{m.senderId ? (names.get(m.senderId) ?? "Alguém") : "Conta excluída"}</span> : null}
              <div className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", mine ? "bg-volt-500 text-ink-950" : "bg-ink-750 text-paper")}>
                <Body text={m.body} />
                {m.sharedPostId ? (
                  <Link href={`/p/${m.sharedPostId}`} className="mt-2 block rounded-lg bg-black/25 px-3 py-2 text-sm underline-offset-2 hover:underline">
                    {m.sharedPostTitle ?? "Trabalho compartilhado"}
                  </Link>
                ) : null}
              </div>
              <span className="mt-0.5 text-[11px] text-fog-500">{timeAgo(new Date(m.createdAt))}</span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {blocked ? (
        <p className="border-t border-ink-700 p-4 text-center text-sm text-fog-500">Não é possível enviar mensagens nesta conversa.</p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-ink-700 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const text = body.trim();
            if (!text) return;
            start(async () => {
              const r = await sendMessageAction({ conversationId, body: text });
              if (!r.ok) return toast.show(r.error, "error");
              setItems((prev) => prev.concat({ id: r.data.id, senderId: viewerId, body: text, createdAt: r.data.createdAt, sharedPostId: null, sharedPostTitle: null }));
              setBody("");
            });
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            aria-label="Mensagem"
            placeholder="Escreva uma mensagem"
            rows={1}
            maxLength={4000}
            className="min-h-11 flex-1 resize-none"
          />
          <Button type="submit" size="icon" aria-label="Enviar" loading={pending} disabled={!body.trim()}>
            {pending ? null : <Send className="size-4" />}
          </Button>
        </form>
      )}
      <div className="flex justify-end px-3 pb-2">
        <button
          className="text-xs text-fog-500 hover:text-danger-400"
          onClick={() =>
            confirm("Sair desta conversa? Ela some da sua lista.") &&
            start(async () => {
              const r = await leaveConversationAction(conversationId);
              if (!r.ok) return toast.show(r.error, "error");
              router.push("/mensagens");
            })
          }
        >
          Sair da conversa
        </button>
      </div>
    </div>
  );
}
