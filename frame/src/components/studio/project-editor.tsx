"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ExternalLink, Plus, Send, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deleteProjectAction, updateProjectAction } from "@/server/actions/studio";
import type { StudioLink, StudioTask } from "@/server/db/schema";
import { cn } from "@/lib/utils";

import { PROJECT_STATUS as STATUS, type ProjectStatus as Status } from "@/lib/creative/status";

export function ProjectEditor({
  project,
}: {
  project: { id: string; title: string; description: string; status: Status; tasks: StudioTask[]; links: StudioLink[]; publishedPostId: string | null };
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<Status>(project.status);
  const [tasks, setTasks] = useState(project.tasks);
  const [links, setLinks] = useState(project.links);
  const [newTask, setNewTask] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const done = tasks.filter((t) => t.done).length;

  function save(next?: Partial<{ tasks: StudioTask[]; status: Status }>) {
    start(async () => {
      const r = await updateProjectAction(project.id, { title, description, status: next?.status ?? status, tasks: next?.tasks ?? tasks, links: links.filter((l) => l.label || l.url) });
      if (!r.ok) {
        setErrors({ ...(r.fields ?? {}), form: r.error });
        return toast.show(r.error, "error");
      }
      setErrors({});
      if (!next) toast.show(r.message ?? "Salvo.");
      router.refresh();
    });
  }
  const toggle = (id: string) => {
    const t = tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    setTasks(t);
    save({ tasks: t }); // marcar tarefa salva na hora
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Field label="Título" id="title" error={errors.title}>
          <Input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="font-display text-2xl" />
        </Field>
        <Field label="Notas do projeto" id="description" optional>
          <Textarea id="description" rows={8} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conceito, referências, lista de locações, ideias de legenda…" />
        </Field>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Tarefas</h2>
            <span className="text-xs text-fog-500">
              {done}/{tasks.length} concluídas
            </span>
          </div>
          {tasks.length ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-800" aria-hidden>
              <div className="h-full rounded-full bg-volt-500 transition-[width] duration-500" style={{ width: `${(done / tasks.length) * 100}%` }} />
            </div>
          ) : null}
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="group flex items-center gap-3 rounded-[var(--radius-sm)] bg-ink-850 px-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={t.text}
                  onClick={() => toggle(t.id)}
                  className={cn("grid size-6 shrink-0 place-items-center rounded-full ring-2 transition-colors", t.done ? "bg-volt-500 ring-volt-500 text-ink-950" : "ring-ink-600 hover:ring-fog-400")}
                >
                  {t.done ? <Check className="size-4" aria-hidden /> : null}
                </button>
                <span className={cn("flex-1 text-sm", t.done ? "text-fog-500 line-through" : "text-fog-200")}>{t.text}</span>
                <button type="button" aria-label={`Remover tarefa ${t.text}`} onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))} className="text-fog-500 opacity-60 hover:text-danger-400 group-hover:opacity-100">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = newTask.trim();
              if (!text) return;
              setTasks((ts) => [...ts, { id: `t${Date.now().toString(36)}`, text: text.slice(0, 200), done: false }]);
              setNewTask("");
            }}
          >
            <Input aria-label="Nova tarefa" placeholder="Nova tarefa…" value={newTask} maxLength={200} onChange={(e) => setNewTask(e.target.value)} />
            <Button type="submit" variant="secondary" aria-label="Adicionar tarefa">
              <Plus className="size-4" />
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Ferramentas e links externos</h2>
          {links.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="Nome do link" placeholder="Ex.: Moodboard no Pinterest" value={l.label} maxLength={60} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Endereço do link" placeholder="https://" value={l.url} maxLength={500} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              {l.url.startsWith("https://") ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-ink-850 text-fog-300 hover:text-paper" aria-label={`Abrir ${l.label || "link"}`}>
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
              <Button type="button" variant="ghost" size="icon" aria-label="Remover link" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {Object.keys(errors).some((k) => k.startsWith("links")) ? <p className="text-sm text-danger-400">Confira os links: use endereços que começam com https://</p> : null}
          {links.length < 12 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}>
              <Plus className="size-4" aria-hidden /> Adicionar link
            </Button>
          ) : null}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-3 rounded-[var(--radius-lg)] bg-ink-850 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Etapa</h2>
          <div role="radiogroup" aria-label="Etapa do projeto" className="grid grid-cols-2 gap-2">
            {STATUS.map((s) => (
              <button
                key={s.v}
                type="button"
                role="radio"
                aria-checked={status === s.v}
                onClick={() => {
                  setStatus(s.v);
                  save({ status: s.v });
                }}
                className={cn("rounded-[var(--radius-sm)] px-3 py-2 text-sm ring-1 ring-inset", status === s.v ? "bg-volt-500 text-ink-950 ring-volt-500" : "text-fog-300 ring-white/10 hover:text-paper")}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" size="lg" loading={pending} onClick={() => save()}>
          Salvar projeto
        </Button>
        {project.publishedPostId ? (
          <ButtonLink href={`/p/${project.publishedPostId}`} variant="outline" className="w-full">
            Ver publicação
          </ButtonLink>
        ) : (
          <ButtonLink href={`/publicar?projeto=${project.id}`} variant="secondary" className="w-full">
            <Send className="size-4" aria-hidden /> Publicar no FRAME
          </ButtonLink>
        )}
        {errors.form ? <p role="alert" className="text-sm text-danger-400">{errors.form}</p> : null}
        <button
          type="button"
          className="w-full text-center text-sm text-danger-400 hover:underline"
          onClick={() =>
            start(async () => {
              if (!confirm("Apagar este projeto? As tarefas e notas serão perdidas.")) return;
              const r = await deleteProjectAction(project.id);
              if (!r.ok) return toast.show(r.error, "error");
              toast.show(r.message ?? "Apagado.");
              router.push("/estudio?aba=projetos");
            })
          }
        >
          Apagar projeto
        </button>
        <Link href="/estudio" className="block text-center text-sm text-fog-400 hover:text-paper">
          Voltar ao estúdio
        </Link>
      </aside>
    </div>
  );
}

export function NewProjectButton({ label = "Novo projeto" }: { label?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const { createProjectAction } = await import("@/server/actions/studio");
          const r = await createProjectAction({ title: "Projeto sem título" });
          if (!r.ok) return toast.show(r.error, "error");
          router.push(`/estudio/projetos/${r.data.id}`);
        })
      }
    >
      <Plus className="size-4" aria-hidden /> {label}
    </Button>
  );
}
