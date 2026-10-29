"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Ban, Check, Link2, MoreHorizontal, Share2, Trash2, VolumeX, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/field";
import { deletePostAction, updateVisibilityAction } from "@/server/actions/posts";
import { rateTutorialAction, setBlockAction, setMuteAction } from "@/server/actions/social";
import { ReportButton } from "@/components/social/report-dialog";
import { cn } from "@/lib/utils";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* usuário cancelou: cai para copiar */
          }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.show("Link copiado.");
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-fog-300 transition-colors hover:bg-white/5 hover:text-paper"
    >
      {copied ? <Check className="size-[18px]" aria-hidden /> : <Share2 className="size-[18px]" aria-hidden />}
      Compartilhar
    </button>
  );
}

export function OwnerControls({ postId, visibility }: { postId: string; visibility: "public" | "followers" | "private" }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="vis">
        Visibilidade
      </label>
      <Select
        id="vis"
        defaultValue={visibility}
        disabled={pending}
        className="h-9 w-auto text-sm"
        onChange={(e) =>
          start(async () => {
            const r = await updateVisibilityAction(postId, e.target.value as "public" | "followers" | "private");
            toast.show(r.ok ? (r.message ?? "Atualizado.") : r.error, r.ok ? "success" : "error");
            router.refresh();
          })
        }
      >
        <option value="public">Público</option>
        <option value="followers">Seguidores</option>
        <option value="private">Só eu</option>
      </Select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("Excluir esta publicação? Os arquivos serão apagados e isso não pode ser desfeito.")) return;
            const r = await deletePostAction(postId);
            if (!r.ok) return toast.show(r.error, "error");
            toast.show(r.message ?? "Excluído.");
            router.push("/");
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-danger-400 hover:bg-danger-500/10"
      >
        <Trash2 className="size-4" aria-hidden /> Excluir
      </button>
    </div>
  );
}

export function UserSafetyMenu({ userId, handle, muted, blocked }: { userId: string; handle: string; muted: boolean; blocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      toast.show(r.ok ? (r.message ?? "Feito.") : (r.error ?? "Erro."), r.ok ? "success" : "error");
      setOpen(false);
      router.refresh();
    });
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={`Mais opções para @${handle}`} className="grid size-10 place-items-center rounded-full text-fog-400 hover:bg-white/5 hover:text-paper">
        <MoreHorizontal className="size-5" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 animate-rise rounded-[var(--radius-md)] bg-ink-850 p-1.5 shadow-[var(--shadow-pop)]">
          <button role="menuitem" onClick={() => act(() => setMuteAction(userId, !muted))} className="flex w-full items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm text-fog-300 hover:bg-white/5 hover:text-paper">
            <VolumeX className="size-4" aria-hidden /> {muted ? "Remover silêncio" : `Silenciar @${handle}`}
          </button>
          <button role="menuitem" onClick={() => act(() => setBlockAction(userId, !blocked))} className="flex w-full items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm text-danger-400 hover:bg-danger-500/10">
            <Ban className="size-4" aria-hidden /> {blocked ? "Desbloquear" : `Bloquear @${handle}`}
          </button>
          <div className="px-1.5 py-1">
            <ReportButton targetType="user" targetId={userId} label="Denunciar perfil" />
          </div>
          <button
            role="menuitem"
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`);
              toast.show("Link do perfil copiado.");
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm text-fog-300 hover:bg-white/5 hover:text-paper"
          >
            <Link2 className="size-4" aria-hidden /> Copiar link do perfil
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HelpfulRating({ postId, initial, count, canRate }: { postId: string; initial: boolean | null; count: number; canRate: boolean }) {
  const [vote, setVote] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const send = (helpful: boolean) =>
    start(async () => {
      const r = await rateTutorialAction(postId, helpful);
      if (!r.ok) return toast.show(r.error, "error");
      setVote(helpful);
      toast.show(r.message ?? "Obrigado!");
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-ink-850 p-4">
      <p className="text-sm text-fog-300">
        Este tutorial foi útil? <span className="text-fog-500">({count} {count === 1 ? "pessoa achou" : "pessoas acharam"} útil)</span>
      </p>
      {canRate ? (
        <div className="flex gap-2">
          <button disabled={pending} onClick={() => send(true)} aria-pressed={vote === true} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset", vote === true ? "bg-success-400/15 text-success-400 ring-success-400/40" : "text-fog-300 ring-ink-600 hover:text-paper")}>
            <ThumbsUp className="size-4" aria-hidden /> Sim
          </button>
          <button disabled={pending} onClick={() => send(false)} aria-pressed={vote === false} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset", vote === false ? "bg-danger-500/15 text-danger-400 ring-danger-500/40" : "text-fog-300 ring-ink-600 hover:text-paper")}>
            <ThumbsDown className="size-4" aria-hidden /> Não
          </button>
        </div>
      ) : null}
    </div>
  );
}
