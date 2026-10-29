"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { EyeOff, Flag, FolderPlus, Link2, MoreHorizontal } from "lucide-react";
import { createProjectAction } from "@/server/actions/studio";
import { ReportButton } from "@/components/social/report-dialog";
import { useToast } from "@/components/ui/toast";
import { setMuteAction } from "@/server/actions/social";

/** Ações rápidas do card: copiar link, denunciar e deixar de ver o autor. */
export function CardMenu({ postId, postTitle, authorId, authorHandle, signedIn, isOwn, onHide }: { postId: string; postTitle: string; authorId: string; authorHandle: string; signedIn: boolean; isOwn: boolean; onHide?: (authorId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-left text-sm text-fog-300 hover:bg-white/5 hover:text-paper";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Mais opções"
        className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-fog-500 transition-colors hover:bg-white/5 hover:text-paper"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div role="menu" className="absolute bottom-full right-0 z-30 mb-2 w-60 animate-rise rounded-[var(--radius-md)] bg-ink-850 p-1.5 shadow-[var(--shadow-pop)]">
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/p/${postId}`).catch(() => {});
              toast.show("Link copiado.");
              setOpen(false);
            }}
          >
            <Link2 className="size-4" aria-hidden /> Copiar link
          </button>
          {signedIn ? (
            <button
              role="menuitem"
              type="button"
              disabled={pending}
              className={item}
              onClick={() =>
                start(async () => {
                  const r = await createProjectAction({
                    title: `Inspirado em: ${postTitle}`.slice(0, 120),
                    description: `Referência: ${window.location.origin}/p/${postId} (de @${authorHandle}). Recrie com a sua identidade e dê o crédito da inspiração.`,
                    sourceType: "post",
                    sourceRef: postId,
                  });
                  setOpen(false);
                  if (!r.ok) return toast.show(r.error, "error");
                  router.push(`/estudio/projetos/${r.data.id}`);
                })
              }
            >
              <FolderPlus className="size-4" aria-hidden /> Virar projeto no meu estúdio
            </button>
          ) : null}
          {signedIn && !isOwn ? (
            <>
              <button
                role="menuitem"
                type="button"
                disabled={pending}
                className={item}
                onClick={() =>
                  start(async () => {
                    const r = await setMuteAction(authorId, true);
                    setOpen(false);
                    if (!r.ok) return toast.show(r.error, "error");
                    toast.show(`Você não verá mais publicações de @${authorHandle} no feed. Desfaça em Configurações.`);
                    onHide?.(authorId);
                    router.refresh();
                  })
                }
              >
                <EyeOff className="size-4" aria-hidden /> Não ver mais @{authorHandle}
              </button>
              <button
                role="menuitem"
                type="button"
                className={`${item} text-danger-400 hover:text-danger-400`}
                onClick={() => {
                  setOpen(false);
                  setReporting(true);
                }}
              >
                <Flag className="size-4" aria-hidden /> Denunciar
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {reporting ? <ReportButton targetType="post" targetId={postId} open={reporting} onOpenChange={setReporting} /> : null}
    </div>
  );
}
