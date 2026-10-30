"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createProjectAction, toggleSavedExampleAction } from "@/server/actions/studio";

export function SaveExampleButton({ slug, initial, signedIn }: { slug: string; initial: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      aria-pressed={saved}
      loading={pending}
      onClick={() => {
        if (!signedIn) return router.push(`/entrar?next=/laboratorio/${slug}`);
        start(async () => {
          const r = await toggleSavedExampleAction(slug);
          if (!r.ok) return toast.show(r.error, "error");
          setSaved(r.data.saved);
          toast.show(r.data.saved ? "Salvo em Meu estúdio › Referências." : "Removido das referências.");
        });
      }}
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
      {saved ? "Inspiração salva" : "Salvar inspiração"}
    </Button>
  );
}

/** Cria um projeto no estúdio com as etapas do exemplo como tarefas. */
export function CreateVersionButton({ slug, title, steps, signedIn }: { slug: string; title: string; steps: string[]; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      loading={pending}
      onClick={() => {
        if (!signedIn) return router.push(`/entrar?next=/laboratorio/${slug}`);
        start(async () => {
          const r = await createProjectAction({
            title: `Minha versão: ${title}`.slice(0, 120),
            description: `Baseado no exemplo do Laboratório Criativo “${title}”.`,
            tasks: steps.map((text, i) => ({ id: `t${i + 1}`, text: text.slice(0, 200), done: false })),
            sourceType: "example",
            sourceRef: slug,
          });
          if (!r.ok) return toast.show(r.error, "error");
          toast.show("Projeto criado. Bora criar!");
          router.push(`/estudio/projetos/${r.data.id}`);
        });
      }}
    >
      <FolderPlus className="size-4" aria-hidden /> Criar minha versão
    </Button>
  );
}
