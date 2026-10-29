"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Compartilha o link de cadastro (WhatsApp, Instagram… pelo menu do celular) ou copia. */
export function InviteButton({ className, label = "Convidar pessoas" }: { className?: string; label?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/cadastro`;
        const text = "Vem pra FRAME — a rede social de quem cria: fotografia, vídeo, edição e design. Crie sua conta:";
        if (navigator.share) {
          try {
            await navigator.share({ title: "FRAME", text, url });
            return;
          } catch {
            /* cancelado: copia */
          }
        }
        await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
        setCopied(true);
        toast.show("Convite copiado. Cole no WhatsApp ou onde quiser.");
        setTimeout(() => setCopied(false), 2500);
      }}
      className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-paper ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/[0.06]", className)}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />} {label}
    </button>
  );
}
