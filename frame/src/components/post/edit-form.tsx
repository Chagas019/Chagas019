"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updatePostAction } from "@/server/actions/posts";
import { CATEGORIES, type CategorySlug } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { CreditsEditor, cleanCredits, type CreditDraft } from "./credits-editor";

export type EditablePost = {
  id: string;
  title: string;
  body: string;
  categories: string[];
  tools: string[];
  visibility: "public" | "followers" | "private";
  isCollaborative: boolean;
  credits: CreditDraft[];
  commentsEnabled: boolean;
  isDraft: boolean;
  allowRemix: boolean;
  projectInfo: { goal?: string; techniques?: string; result?: string; references?: string };
  alts: { id: string; alt: string; isImage: boolean }[];
};

export function EditPostForm({ post }: { post: EditablePost }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<CategorySlug[]>(post.categories as CategorySlug[]);
  const [visibility, setVisibility] = useState(post.visibility);
  const [collab, setCollab] = useState(post.isCollaborative);
  const [comments, setComments] = useState(post.commentsEnabled);
  const [remix, setRemix] = useState(post.allowRemix);
  const [credits, setCredits] = useState<CreditDraft[]>(post.credits);
  const [alts, setAlts] = useState(post.alts.map((a) => a.alt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function save(publish: boolean, form: HTMLFormElement) {
    const fd = new FormData(form);
    const input = {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      categories,
      tools: String(fd.get("tools") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      visibility,
      isCollaborative: collab,
      credits: cleanCredits(credits),
      commentsEnabled: comments,
      alts,
      publish,
      allowRemix: remix,
      projectInfo: {
        goal: String(fd.get("goal") ?? ""),
        techniques: String(fd.get("techniques") ?? ""),
        result: String(fd.get("result") ?? ""),
        references: String(fd.get("references") ?? ""),
      },
    };
    setErrors({});
    start(async () => {
      const r = await updatePostAction(post.id, input);
      if (!r.ok) {
        setErrors({ ...(r.fields ?? {}), form: r.error });
        return toast.show(r.error, "error");
      }
      toast.show(publish ? "Publicado! Seu trabalho já está no FRAME." : (r.message ?? "Salvo."));
      router.push(`/p/${post.id}`);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        save(submitter?.value === "publish", e.currentTarget);
      }}
    >
      <Field label="Título" id="title" error={errors.title}>
        <Input id="title" name="title" defaultValue={post.title} maxLength={140} required invalid={!!errors.title} />
      </Field>
      <Field label="Descrição" id="body" optional error={errors.body} hint="Use #hashtags e @mencione quem participou.">
        <Textarea id="body" name="body" defaultValue={post.body} maxLength={5000} rows={5} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-fog-200">Categorias</p>
        <ChipGroup label="Categorias" options={CATEGORIES} value={categories} onChange={setCategories} max={5} />
      </div>
      <Field label="Ferramentas usadas" id="tools" optional hint="Separe por vírgula">
        <Input id="tools" name="tools" defaultValue={post.tools.join(", ")} />
      </Field>
      {post.alts.some((a) => a.isImage) ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fog-200">Texto alternativo das imagens</p>
          {post.alts.map((a, i) =>
            a.isImage ? (
              <Input key={a.id} aria-label={`Texto alternativo da imagem ${i + 1}`} placeholder={`Imagem ${i + 1}: o que aparece nela?`} value={alts[i] ?? ""} maxLength={300} onChange={(e) => setAlts((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
            ) : null,
          )}
        </div>
      ) : null}
      <CreditsEditor value={credits} onChange={setCredits} error={errors.credits} />
      <div role="radiogroup" aria-label="Visibilidade" className="grid gap-2 sm:grid-cols-3">
        {(
          [
            { v: "public", t: "Público" },
            { v: "followers", t: "Seguidores aprovados" },
            { v: "private", t: "Só eu" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={visibility === o.v}
            onClick={() => setVisibility(o.v)}
            className={cn("rounded-[var(--radius-md)] p-3 text-left text-sm ring-1 ring-inset", visibility === o.v ? "bg-volt-500/10 ring-volt-500" : "bg-ink-850 ring-ink-700")}
          >
            {o.t}
          </button>
        ))}
      </div>
      <Switch checked={collab} onChange={setCollab} label="Projeto colaborativo" />
      <Switch checked={comments} onChange={setComments} label="Aceitar comentários e feedback" />
      <Switch checked={remix} onChange={setRemix} label="Permitir remix" description="Remixes já publicados continuam com o crédito; desligar impede novos." />
      <details className="rounded-[var(--radius-md)] bg-ink-850 p-4" open={Object.values(post.projectInfo).some(Boolean)}>
        <summary className="cursor-pointer text-sm font-medium text-fog-200">Detalhes do projeto (opcional)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Objetivo" id="goal" optional><Textarea id="goal" name="goal" rows={2} maxLength={500} defaultValue={post.projectInfo.goal} /></Field>
          <Field label="Técnicas" id="techniques" optional><Textarea id="techniques" name="techniques" rows={2} maxLength={500} defaultValue={post.projectInfo.techniques} /></Field>
          <Field label="Resultado final" id="result" optional><Textarea id="result" name="result" rows={2} maxLength={1000} defaultValue={post.projectInfo.result} /></Field>
          <Field label="Referências autorizadas" id="references" optional><Textarea id="references" name="references" rows={2} maxLength={1000} defaultValue={post.projectInfo.references} /></Field>
        </div>
      </details>
      <p className="text-xs text-fog-500">As imagens e vídeos não podem ser trocados depois de publicados. Para isso, exclua e publique de novo.</p>
      {errors.form ? <p role="alert" className="text-sm text-danger-400">{errors.form}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 pt-6">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" value="save" variant={post.isDraft ? "secondary" : "primary"} loading={pending}>
          {post.isDraft ? "Salvar rascunho" : "Salvar alterações"}
        </Button>
        {post.isDraft ? (
          <Button type="submit" value="publish" loading={pending}>
            Publicar agora
          </Button>
        ) : null}
      </div>
    </form>
  );
}
