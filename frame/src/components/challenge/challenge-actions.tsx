"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Vote } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { submitToChallengeAction, toggleVoteAction, withdrawSubmissionAction } from "@/server/actions/challenge";
import { cn, mediaUrl } from "@/lib/utils";

export function SubmitPanel({ challengeId, slug, myPosts }: { challengeId: string; slug: string; myPosts: { id: string; title: string; coverId: string | null }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!myPosts.length)
    return (
      <div className="space-y-3">
        <p className="text-sm text-fog-400">Publique um trabalho público e depois volte aqui para enviá-lo.</p>
        <ButtonLink href="/publicar">Publicar trabalho</ButtonLink>
      </div>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm text-fog-400">Escolha um dos seus trabalhos públicos:</p>
      <ul role="radiogroup" aria-label="Seus trabalhos" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {myPosts.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected === p.id}
              aria-label={p.title}
              onClick={() => setSelected(p.id)}
              className={cn("relative block aspect-square w-full overflow-hidden rounded-[var(--radius-sm)] bg-ink-800 ring-2 transition", selected === p.id ? "ring-volt-400" : "ring-transparent hover:ring-ink-600")}
            >
              {p.coverId ? <Image src={mediaUrl(p.coverId, "thumb")} alt="" fill unoptimized sizes="120px" className="object-cover" /> : <span className="p-2 text-xs">{p.title}</span>}
              {selected === p.id ? (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-volt-500 text-white">
                  <Check className="size-3.5" />
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <Field label="Nota sobre o processo" id="note" optional hint="O que você tentou? O que aprendeu?">
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
      </Field>
      <Button
        disabled={!selected}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await submitToChallengeAction({ challengeId, postId: selected!, note, slug });
            toast.show(r.ok ? (r.message ?? "Enviado!") : r.error, r.ok ? "success" : "error");
            if (r.ok) router.refresh();
          })
        }
      >
        Enviar ao desafio
      </Button>
    </div>
  );
}

export function WithdrawButton({ challengeId, slug }: { challengeId: string; slug: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        confirm("Retirar seu envio? Você poderá enviar outro trabalho enquanto o desafio estiver aberto.") &&
        start(async () => {
          const r = await withdrawSubmissionAction(challengeId, slug);
          toast.show(r.ok ? (r.message ?? "Retirado.") : r.error, r.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      Retirar envio
    </Button>
  );
}

export function VoteButton({ submissionId, initial, disabled }: { submissionId: string; initial: boolean; disabled?: boolean }) {
  const [voted, setVoted] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-pressed={voted}
      onClick={() =>
        start(async () => {
          const r = await toggleVoteAction(submissionId);
          if (!r.ok) return toast.show(r.error, "error");
          setVoted(r.data.voted);
          toast.show(r.data.voted ? `Voto registrado (${r.data.used}/${r.data.max}).` : `Voto retirado (${r.data.used}/${r.data.max}).`);
          router.refresh();
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-50",
        voted ? "bg-volt-500 text-white" : "bg-ink-750 text-fog-200 hover:bg-ink-700",
      )}
    >
      <Vote className="size-4" aria-hidden /> {voted ? "Votado" : "Votar"}
    </button>
  );
}
