"use client";

import { RichText } from "@/components/ui/rich-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ReportButton } from "@/components/social/report-dialog";
import { addCommentAction, deleteCommentAction } from "@/server/actions/social";
import { timeAgo } from "@/lib/utils";

export type CommentItem = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  authorId: string;
  authorHandle: string;
  authorName: string;
  authorAvatar: string | null;
};

function CommentForm({ postId, parentId, onDone, autoFocus }: { postId: string; parentId?: string; onDone?: () => void; autoFocus?: boolean }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        start(async () => {
          const r = await addCommentAction({ postId, parentId: parentId ?? null, body });
          if (!r.ok) return toast.show(r.error, "error");
          setBody("");
          onDone?.();
          router.refresh();
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Escreva uma resposta…" : "Comente com respeito. Feedback específico ajuda mais."}
        aria-label={parentId ? "Resposta" : "Comentário"}
        maxLength={2000}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
          {parentId ? "Responder" : "Comentar"}
        </Button>
      </div>
    </form>
  );
}

export function Comments({ postId, comments, viewerId, postAuthorId, enabled = true }: { postId: string; comments: CommentItem[]; viewerId: string | null; postAuthorId: string; enabled?: boolean }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ids = new Set(comments.map((c) => c.id));
  const roots = comments.filter((c) => !c.parentId || !ids.has(c.parentId));
  const replies = (id: string) => comments.filter((c) => c.parentId === id);

  const render = (c: CommentItem, nested = false) => (
    <li key={c.id} className={nested ? "ml-10 mt-4" : "mt-6"}>
      <div className="flex gap-3">
        <Link href={`/u/${c.authorHandle}`} aria-label={c.authorName}>
          <Avatar mediaId={c.authorAvatar} name={c.authorName} size={nested ? 28 : 34} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link href={`/u/${c.authorHandle}`} className="font-medium text-paper hover:underline">
              {c.authorName}
            </Link>{" "}
            <span className="text-xs text-fog-500">{timeAgo(new Date(c.createdAt))}</span>
          </p>
          <RichText text={c.body} className="mt-1 text-pretty text-[15px] text-fog-200" />
          <div className="mt-1.5 flex gap-4">
            {viewerId && !nested && enabled ? (
              <button type="button" className="text-xs text-fog-500 hover:text-paper" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                Responder
              </button>
            ) : null}
            {viewerId && (viewerId === c.authorId || viewerId === postAuthorId) ? (
              <button
                className="text-xs text-fog-500 hover:text-danger-400"
                onClick={() =>
                  start(async () => {
                    if (!confirm("Excluir este comentário?")) return;
                    const r = await deleteCommentAction(c.id, postId);
                    if (!r.ok) return toast.show(r.error, "error");
                    toast.show(r.message ?? "Removido.");
                    router.refresh();
                  })
                }
              >
                Excluir
              </button>
            ) : null}
            {viewerId && viewerId !== c.authorId ? <ReportButton targetType="comment" targetId={c.id} compact /> : null}
          </div>
          {replyTo === c.id ? (
            <div className="mt-3">
              <CommentForm postId={postId} parentId={c.id} onDone={() => setReplyTo(null)} autoFocus />
            </div>
          ) : null}
        </div>
      </div>
      {!nested && replies(c.id).length ? <ul>{replies(c.id).map((r) => render(r, true))}</ul> : null}
    </li>
  );

  return (
    <section aria-labelledby="comentarios" className="space-y-4">
      <h2 id="comentarios" className="flex items-center gap-2 font-display text-3xl">
        Conversa <span className="text-base text-fog-500">({comments.length})</span>
      </h2>
      {!enabled ? (
        <p className="rounded-[var(--radius-md)] bg-ink-850 p-4 text-sm text-fog-400">O autor desativou os comentários nesta publicação.</p>
      ) : viewerId ? (
        <CommentForm postId={postId} />
      ) : (
        <p className="rounded-[var(--radius-md)] bg-ink-850 p-4 text-sm text-fog-400">
          <Link href={`/entrar?next=/p/${postId}`} className="text-paper underline underline-offset-4">
            Entre
          </Link>{" "}
          para comentar e fazer perguntas ao autor.
        </p>
      )}
      {comments.length === 0 && enabled ? (
        <p className="flex items-center gap-2 py-6 text-sm text-fog-500">
          <MessageCircle className="size-4" aria-hidden /> Seja a primeira pessoa a comentar.
        </p>
      ) : comments.length ? (
        <ul>{roots.map((c) => render(c))}</ul>
      ) : null}
    </section>
  );
}
