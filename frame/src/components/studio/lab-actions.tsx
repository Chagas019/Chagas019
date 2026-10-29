"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Flag } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createProjectAction } from "@/server/actions/studio";

/** "Participar": cria um projeto no estúdio com as etapas e o prazo sugerido. */
export function JoinLabButton({ slug, title, steps, days, signedIn }: { slug: string; title: string; steps: string[]; days?: number; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!signedIn) return router.push(`/entrar?next=/lab/${slug}`);
        start(async () => {
          const r = await createProjectAction({
            title: `LAB: ${title}`.slice(0, 120),
            description: days ? `Prazo pessoal sugerido: ${days} dias. Ao terminar, publique com a hashtag do desafio.` : "Ao terminar, publique com a hashtag do desafio.",
            tasks: steps.map((text, i) => ({ id: `t${i + 1}`, text: text.slice(0, 200), done: false })),
            sourceType: "lab",
            sourceRef: slug,
          });
          if (!r.ok) return toast.show(r.error, "error");
          toast.show("Missão aceita. Ela está no seu estúdio.");
          router.push(`/estudio/projetos/${r.data.id}`);
        });
      }}
      className="inline-flex h-12 items-center gap-2 rounded-full bg-volt-500 px-6 font-semibold text-ink-950 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
    >
      <Flag className="size-4" aria-hidden /> {pending ? "Criando…" : "Participar"}
    </button>
  );
}
