"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Eye, GraduationCap, ImageIcon, MessagesSquare, Plus, Sparkles, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { RichText } from "@/components/ui/rich-text";
import { extractHashtags } from "@/lib/text";
import { CreditsEditor, cleanCredits, type CreditDraft } from "./credits-editor";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createPostAction } from "@/server/actions/posts";
import { CATEGORIES, LAB_TOPICS, LEVELS, POST_FORMATS, type CategorySlug } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { MediaUploader, type UploadedItem } from "./uploader";

type Kind = "work" | "showcase" | "tutorial" | "discussion";

const KINDS: { slug: Kind; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { slug: "work", label: "Trabalho", desc: "Foto, carrossel ou vídeo", icon: ImageIcon },
  { slug: "showcase", label: "Showcase", desc: "Resultado + processo + antes/depois", icon: Sparkles },
  { slug: "tutorial", label: "Tutorial", desc: "Ensine uma técnica no FRAME LAB", icon: GraduationCap },
  { slug: "discussion", label: "Discussão", desc: "Pergunta ou conversa na comunidade", icon: MessagesSquare },
];

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export type PublishPrefill = { title: string; body: string; categories: CategorySlug[]; projectId: string | null; remixOf?: { id: string; title: string; authorName: string; authorHandle: string } | null };

export function PublishForm({
  initialKind,
  community,
  viewerId,
  prefill,
}: {
  initialKind: Kind;
  community: { id: string; name: string } | null;
  viewerId: string;
  prefill?: PublishPrefill;
}) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [before, setBefore] = useState<UploadedItem[]>([]);
  const [categories, setCategories] = useState<CategorySlug[]>(prefill?.categories ?? []);
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const [collab, setCollab] = useState(false);
  const [hideTech, setHideTech] = useState(false);
  const [credits, setCredits] = useState<CreditDraft[]>([]);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [allowRemix, setAllowRemix] = useState(false);
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef(false);
  const [steps, setSteps] = useState<{ title: string; body: string }[]>([{ title: "", body: "" }]);
  const [resources, setResources] = useState<{ label: string; url: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const uploading = items.some((i) => i.status === "uploading") || before.some((i) => i.status === "uploading");
  const kinds = community ? KINDS : KINDS.filter((k) => k.slug !== "discussion");
  const needsMedia = kind === "work" || kind === "showcase";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const asDraft = draftRef.current;
    draftRef.current = false;
    const fd = new FormData(e.currentTarget);
    const done = items.filter((i) => i.status === "done" && i.mediaId);
    if (needsMedia && done.length === 0) return setErrors({ media: "Adicione pelo menos uma imagem ou vídeo." });
    const hasVideo = done[0]?.kind === "video";
    const autoFormat = kind === "discussion" ? "text" : hasVideo ? "video" : done.length > 1 ? "carousel" : "photo";
    const format = String(fd.get("format") || autoFormat);
    const input = {
      kind,
      format: kind === "showcase" && before.length ? "before_after" : kind === "tutorial" && done.length === 0 ? "text" : format,
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      categories,
      tools: splitList(String(fd.get("tools") ?? "")),
      visibility,
      isCollaborative: collab,
      communityId: community?.id ?? null,
      alts: done.map((d) => d.alt),
      credits: cleanCredits(credits),
      commentsEnabled,
      draft: asDraft,
      allowRemix: kind === "discussion" ? false : allowRemix,
      remixOfId: prefill?.remixOf?.id ?? null,
      projectInfo:
        kind === "showcase"
          ? {
              goal: String(fd.get("goal") ?? ""),
              techniques: String(fd.get("techniques") ?? ""),
              result: String(fd.get("result") ?? ""),
              references: String(fd.get("references") ?? ""),
            }
          : {},
      showcase:
        kind === "showcase"
          ? {
              process: String(fd.get("process") ?? ""),
              camera: String(fd.get("camera") ?? ""),
              lens: String(fd.get("lens") ?? ""),
              lighting: String(fd.get("lighting") ?? ""),
              software: splitList(String(fd.get("software") ?? "")),
              presetName: String(fd.get("presetName") ?? ""),
              editParams: String(fd.get("editParams") ?? ""),
              credits: [],
              portfolioUrl: String(fd.get("portfolioUrl") ?? ""),
              hideTechnical: hideTech,
            }
          : undefined,
      tutorial:
        kind === "tutorial"
          ? {
              topic: String(fd.get("topic")),
              level: String(fd.get("level")),
              durationMinutes: Number(fd.get("durationMinutes")),
              software: String(fd.get("tutorialSoftware") ?? ""),
              steps: steps.filter((s) => s.title.trim()),
              resources: resources.filter((r) => r.label && r.url),
            }
          : undefined,
    };
    setErrors({});
    start(async () => {
      const r = await createPostAction({ ...input, projectId: prefill?.projectId ?? undefined }, {
        mediaIds: done.map((d) => d.mediaId!),
        beforeMediaId: kind === "showcase" ? (before.find((b) => b.status === "done")?.mediaId ?? null) : null,
      });
      if (!r.ok) {
        setErrors({ ...(r.fields ?? {}), form: r.error });
        toast.show(r.error, "error");
        return;
      }
      toast.show(asDraft ? "Rascunho salvo. Só você vê." : "Publicado! Seu trabalho já está no FRAME.");
      router.push(asDraft ? "/rascunhos" : `/p/${r.data.id}`);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-10" noValidate>
      {prefill?.remixOf ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-volt-500/10 p-4 text-sm ring-1 ring-inset ring-volt-500/40">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt-500">Remix</span>
          <p className="text-fog-200">
            Você está criando uma versão de “{prefill.remixOf.title}”, de {prefill.remixOf.authorName} (@{prefill.remixOf.authorHandle}). O crédito e o link para o original são adicionados automaticamente.
          </p>
        </div>
      ) : null}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-fog-300">O que você vai publicar?</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kinds.map((k) => (
            <button
              key={k.slug}
              type="button"
              aria-pressed={kind === k.slug}
              onClick={() => setKind(k.slug)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-[var(--radius-md)] p-4 text-left transition-all",
                kind === k.slug ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-300 hover:bg-ink-800",
              )}
            >
              <k.icon className={cn("size-5", kind === k.slug ? "text-volt-600" : "text-volt-300")} />
              <span className="font-medium">{k.label}</span>
              <span className={cn("text-xs", kind === k.slug ? "text-ink-700" : "text-fog-500")}>{k.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {kind !== "discussion" ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">{kind === "showcase" ? "Resultado final" : kind === "tutorial" ? "Imagens ou vídeo (opcional)" : "Mídia"}</h2>
          <MediaUploader items={items} setItems={setItems} ownerId={viewerId} />
          {errors.media ? <p role="alert" className="text-sm text-danger-400">{errors.media}</p> : null}
        </section>
      ) : null}

      {kind === "showcase" ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Antes da edição</h2>
          <p className="text-sm text-fog-500">Opcional. Envie a foto original para ativar a comparação com controle deslizante.</p>
          <MediaUploader items={before} setItems={setBefore} max={1} purpose="showcase_before" imagesOnly label="Adicionar foto original" ownerId={viewerId} />
        </section>
      ) : null}

      <section className="space-y-5">
        <Field label="Título" id="title" error={errors.title}>
          <Input id="title" name="title" maxLength={140} required invalid={!!errors.title} defaultValue={prefill?.title} />
        </Field>
        <Field label={kind === "tutorial" ? "Introdução" : "Descrição"} id="body" optional error={errors.body}>
          <Textarea id="body" name="body" maxLength={5000} rows={4} defaultValue={prefill?.body} placeholder="Conte a história do trabalho. Use #hashtags e @mencione quem participou." />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fog-200">Categorias <span className="text-xs font-normal text-fog-500">até 5</span></p>
          <ChipGroup label="Categorias" options={CATEGORIES} value={categories} onChange={setCategories} max={5} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ferramentas usadas" id="tools" optional hint="Separe por vírgula: Lightroom, Sony A7 III">
            <Input id="tools" name="tools" />
          </Field>
          {kind === "work" ? (
            <Field label="Formato" id="format" hint="Deixe automático ou especifique">
              <Select id="format" name="format" defaultValue="">
                <option value="">Automático</option>
                {POST_FORMATS.filter((f) => f.slug !== "text").map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      </section>

      {kind === "showcase" ? (
        <section className="space-y-5 rounded-[var(--radius-lg)] bg-ink-900 p-5 ring-1 ring-ink-700 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Processo e ficha técnica</h2>
              <p className="text-sm text-fog-500">Tudo opcional. Compartilhe contexto — não receitas universais.</p>
            </div>
            <div className="w-full sm:w-72">
              <Switch checked={hideTech} onChange={setHideTech} label="Ocultar ficha técnica" description="Mostra só o resultado e o processo." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Objetivo" id="goal" optional>
              <Textarea id="goal" name="goal" rows={2} maxLength={500} placeholder="O que você queria comunicar ou resolver?" />
            </Field>
            <Field label="Técnicas" id="techniques" optional>
              <Textarea id="techniques" name="techniques" rows={2} maxLength={500} placeholder="Luz de recorte, dodge & burn, match cut…" />
            </Field>
            <Field label="Resultado final" id="result" optional>
              <Textarea id="result" name="result" rows={2} maxLength={1000} placeholder="O que deu certo, o que mudaria" />
            </Field>
            <Field label="Referências autorizadas" id="references" optional hint="Cite obras e autores que inspiraram, com permissão quando necessário">
              <Textarea id="references" name="references" rows={2} maxLength={1000} />
            </Field>
          </div>
          <Field label="Como foi construído" id="process" optional>
            <Textarea id="process" name="process" rows={5} maxLength={4000} placeholder="Ideia, referências, decisões de luz e de edição…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Câmera ou celular" id="camera" optional>
              <Input id="camera" name="camera" />
            </Field>
            <Field label="Lente" id="lens" optional>
              <Input id="lens" name="lens" />
            </Field>
            <Field label="Iluminação" id="lighting" optional>
              <Input id="lighting" name="lighting" placeholder="Luz natural de janela, rebatedor…" />
            </Field>
            <Field label="Apps de edição" id="software" optional hint="Separe por vírgula">
              <Input id="software" name="software" />
            </Field>
            <Field label="Preset ou LUT" id="presetName" optional>
              <Input id="presetName" name="presetName" />
            </Field>
            <Field label="Link do portfólio" id="portfolioUrl" optional error={errors["showcase.portfolioUrl"]}>
              <Input id="portfolioUrl" name="portfolioUrl" type="url" placeholder="https://" />
            </Field>
          </div>
          <Field label="Parâmetros de edição" id="editParams" optional hint="Ex.: exposição +0,3; curvas em S suave; HSL laranja -10">
            <Textarea id="editParams" name="editParams" rows={3} maxLength={2000} />
          </Field>
        </section>
      ) : null}

      {kind === "tutorial" ? (
        <section className="space-y-5 rounded-[var(--radius-lg)] bg-ink-900 p-5 ring-1 ring-ink-700 sm:p-6">
          <h2 className="font-display text-2xl">Estrutura do tutorial</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Área" id="topic">
              <Select id="topic" name="topic" defaultValue="lightroom">
                {LAB_TOPICS.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nível" id="level">
              <Select id="level" name="level" defaultValue="iniciante">
                {LEVELS.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tempo estimado (min)" id="durationMinutes" error={errors["tutorial.durationMinutes"]}>
              <Input id="durationMinutes" name="durationMinutes" type="number" min={1} max={600} defaultValue={10} />
            </Field>
            <Field label="Aplicativo" id="tutorialSoftware" optional>
              <Input id="tutorialSoftware" name="tutorialSoftware" />
            </Field>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-fog-200">Etapas</p>
            {steps.map((s, i) => (
              <div key={i} className="space-y-2 rounded-[var(--radius-md)] bg-ink-850 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-volt-500/20 text-xs font-semibold text-volt-300">{i + 1}</span>
                  <Input aria-label={`Título da etapa ${i + 1}`} placeholder="Título da etapa" value={s.title} onChange={(e) => setSteps((ss) => ss.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  {steps.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remover etapa ${i + 1}`} onClick={() => setSteps((ss) => ss.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <Textarea aria-label={`Explicação da etapa ${i + 1}`} placeholder="Explique o que fazer e por quê" rows={3} value={s.body} onChange={(e) => setSteps((ss) => ss.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
              </div>
            ))}
            {errors["tutorial.steps"] ? <p className="text-sm text-danger-400">{errors["tutorial.steps"]}</p> : null}
            <Button type="button" variant="outline" size="sm" onClick={() => setSteps((ss) => [...ss, { title: "", body: "" }])}>
              <Plus className="size-4" aria-hidden /> Adicionar etapa
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-fog-200">Materiais complementares</p>
            {resources.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label="Rótulo" placeholder="Rótulo" value={r.label} onChange={(e) => setResources((rs) => rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input aria-label="Link" placeholder="https://" value={r.url} onChange={(e) => setResources((rs) => rs.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remover material" onClick={() => setResources((rs) => rs.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setResources((rs) => [...rs, { label: "", url: "" }])}>
              <Plus className="size-4" aria-hidden /> Adicionar material
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fog-300">Quem pode ver</h2>
        <div role="radiogroup" aria-label="Visibilidade" className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { v: "public", t: "Público", d: community ? "Membros que podem ver a comunidade" : "Qualquer pessoa, inclusive fora do FRAME" },
              { v: "followers", t: "Seguidores aprovados", d: "Só seguidores que você aprovou em Configurações" },
              { v: "private", t: "Só eu", d: "Rascunho ou arquivo pessoal" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={visibility === o.v}
              onClick={() => setVisibility(o.v)}
              className={cn("rounded-[var(--radius-md)] p-3 text-left ring-1 ring-inset transition", visibility === o.v ? "bg-volt-500/10 ring-volt-500" : "bg-ink-850 ring-ink-700 hover:ring-ink-600")}
            >
              <span className="block text-sm font-medium">{o.t}</span>
              <span className="text-xs text-fog-500">{o.d}</span>
            </button>
          ))}
        </div>
        {kind !== "discussion" ? (
          <Switch checked={collab} onChange={setCollab} label="Projeto colaborativo" description="Aparece no filtro de projetos colaborativos. Marcar colaboradores com @ ativa automaticamente." />
        ) : null}
        {kind !== "discussion" ? (
          <Switch
            checked={allowRemix}
            onChange={setAllowRemix}
            label="Permitir remix"
            description="Outras pessoas podem criar versões a partir deste trabalho, sempre com crédito e link para o original. Dá para desligar depois."
          />
        ) : null}
        <Switch
          checked={commentsEnabled}
          onChange={setCommentsEnabled}
          label="Aceitar comentários e feedback"
          description="Desligue se quiser só mostrar o trabalho, sem conversa."
        />
      </section>

      {kind !== "discussion" ? (
        <section>
          <CreditsEditor value={credits} onChange={setCredits} error={errors.credits} />
        </section>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-ink-700 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fog-500">Ao publicar, você confirma ter direito de compartilhar este conteúdo. Metadados de localização (GPS) são removidos das fotos; em vídeos ainda não — remova antes de enviar se necessário.</p>
        {errors.form ? <p role="alert" className="text-sm text-danger-400">{errors.form}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => {
              const fd = new FormData(formRef.current!);
              setPreview({ title: String(fd.get("title") ?? ""), body: String(fd.get("body") ?? "") });
            }}
          >
            <Eye className="size-4" aria-hidden /> Pré-visualizar
          </Button>
          {!community ? (
            <Button type="submit" variant="secondary" size="lg" disabled={pending || uploading} onClick={() => (draftRef.current = true)}>
              Salvar rascunho
            </Button>
          ) : null}
          <Button type="submit" size="lg" loading={pending} disabled={uploading}>
            {uploading ? "Aguardando envio…" : "Publicar"}
          </Button>
        </div>
      </div>

      <Dialog open={!!preview} onClose={() => setPreview(null)} title="Pré-visualização">
        {preview ? (
          <div className="space-y-4">
            {items[0] ? (
              <div className="overflow-hidden rounded-[var(--radius-md)] bg-ink-800">
                {items[0].kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={items[0].previewUrl} alt={items[0].alt} className="max-h-[50vh] w-full object-contain" />
                ) : (
                  <video src={items[0].previewUrl} className="max-h-[50vh] w-full" controls muted />
                )}
                {items.length > 1 ? <p className="px-3 py-2 text-xs text-fog-400">+{items.length - 1} na galeria</p> : null}
              </div>
            ) : null}
            <h3 className="font-display text-3xl">{preview.title || "Sem título"}</h3>
            {preview.body ? <RichText text={preview.body} className="text-sm text-fog-300" /> : null}
            {extractHashtags(preview.title, preview.body).length ? (
              <p className="text-xs text-fog-500">Hashtags: {extractHashtags(preview.title, preview.body).map((t) => `#${t}`).join(" ")}</p>
            ) : null}
            {cleanCredits(credits).length ? (
              <ul className="text-sm text-fog-300">
                {cleanCredits(credits).map((c, i) => (
                  <li key={i}>
                    {c.role}: {c.name} {c.handle ? <span className="text-volt-500">@{c.handle}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-fog-500">{commentsEnabled ? "Comentários abertos" : "Comentários desativados"} · {visibility === "public" ? "Público" : visibility === "followers" ? "Seguidores aprovados" : "Só você"}</p>
          </div>
        ) : null}
      </Dialog>
    </form>
  );
}
