"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteIdeaAction, projectFromIdeaAction } from "@/server/actions/studio";
import type { IdeaProposal } from "@/server/db/schema";

export function IdeaCard({ id, title, proposal }: { id: string; title: string; proposal: IdeaProposal }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex h-2">
        {proposal.palette.map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-2xl leading-tight">{title}</h3>
        <p className="line-clamp-3 text-sm text-fog-400">{proposal.concept}</p>
        <details className="text-sm text-fog-300">
          <summary className="cursor-pointer text-fog-400 hover:text-paper">Ver roteiro</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {proposal.structure.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="mt-2 text-fog-500">Legenda: {proposal.caption}</p>
        </details>
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await projectFromIdeaAction(id);
                if (!r.ok) return toast.show(r.error, "error");
                router.push(`/estudio/projetos/${r.data.id}`);
              })
            }
          >
            <FolderPlus className="size-4" aria-hidden /> Virar projeto
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Apagar ideia ${title}`}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteIdeaAction(id);
                toast.show(r.ok ? (r.message ?? "Apagada.") : r.error, r.ok ? "success" : "error");
                router.refresh();
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
