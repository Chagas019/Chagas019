"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, FolderOpen, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { CATEGORIES, categoryById } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import type { CategoryId, Project, SavedIdea } from "@/lib/types";
import { EmptyState, PageHeader, relativeTime } from "@/components/ui/bits";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const STATUS: { id: Project["status"]; label: string }[] = [
  { id: "ideia", label: "Ideia" },
  { id: "em-andamento", label: "Em andamento" },
  { id: "concluido", label: "Concluído" },
];
const MAX_IMAGES = 6;

type Draft = Partial<Project> & { title: string; category: CategoryId };

function ProjectForm({ initial, onDone }: { initial?: Project; onDone: (p?: Project) => void }) {
  const { saveProject, uploadImage, backend } = useUserData();
  const [draft, setDraft] = useState<Draft>(
    initial ?? { title: "", description: "", category: "fotografia", status: "ideia", images: [], tags: [] },
  );
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const images = draft.images ?? [];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return setError(`Máximo de ${MAX_IMAGES} imagens por projeto.`);
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of [...files].slice(0, room)) {
        if (f.size > 15 * 1024 * 1024) throw new Error(`“${f.name}” é maior que 15 MB.`);
        urls.push(await uploadImage(f));
      }
      setDraft((d) => ({ ...d, images: [...(d.images ?? []), ...urls] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!t) return;
    setDraft((d) => ({ ...d, tags: [...new Set([...(d.tags ?? []), t])].slice(0, 8) }));
    setTagInput("");
  };

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!draft.title.trim()) return setError("Dê um título ao projeto.");
        setSaving(true);
        try {
          const p = await saveProject(draft);
          onDone(p);
        } catch {
          /* toast */
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <label htmlFor="p-title" className="mb-2 block text-sm text-fog">
          Título
        </label>
        <input id="p-title" className="field" value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Ensaio Luz de Janela" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-cat" className="mb-2 block text-sm text-fog">
            Categoria
          </label>
          <select id="p-cat" className="field" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CategoryId })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-status" className="mb-2 block text-sm text-fog">
            Status
          </label>
          <select id="p-status" className="field" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Project["status"] })}>
            {STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="p-desc" className="mb-2 block text-sm text-fog">
          Descrição
        </label>
        <textarea
          id="p-desc"
          rows={4}
          className="field resize-none"
          maxLength={1500}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Conceito, processo, o que aprendeu…"
        />
      </div>

      <div>
        <p className="mb-2 text-sm text-fog">
          Imagens <span className="text-mute">({images.length}/{MAX_IMAGES})</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={src.slice(-40) + i} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Imagem ${i + 1} do projeto`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, images: (d.images ?? []).filter((_, j) => j !== i) }))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/70 text-paper opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Remover imagem ${i + 1}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="grid aspect-square place-items-center rounded-xl border border-dashed border-line-strong text-fog transition hover:border-lime hover:text-lime disabled:opacity-60"
            >
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus className={`size-5 ${uploading ? "animate-pulse" : ""}`} />
                {uploading ? "Enviando…" : "Adicionar"}
              </span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Selecionar imagens" onChange={(e) => onFiles(e.target.files)} />
        {backend.mode === "local" && <p className="mt-2 text-[11px] text-mute">Modo local: as imagens são comprimidas e salvas no navegador.</p>}
      </div>

      <div>
        <label htmlFor="p-tag" className="mb-2 block text-sm text-fog">
          Tags
        </label>
        <div className="flex gap-2">
          <input
            id="p-tag"
            className="field !py-2"
            value={tagInput}
            maxLength={24}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="luz, retrato… (Enter)"
          />
          <Button type="button" variant="outline" size="sm" className="!h-10" onClick={addTag}>
            Adicionar
          </Button>
        </div>
        {!!draft.tags?.length && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.tags.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((x) => x !== t) }))}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-fog hover:text-paper"
                aria-label={`Remover tag ${t}`}
              >
                #{t} <X className="size-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-[#ffd5cb]">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} disabled={uploading}>
          {initial ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}

function ProjectView({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      {project.images.length > 0 && (
        <div className="mb-6">
          <div className="overflow-hidden rounded-2xl border border-line bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.images[active]} alt={`${project.title} — imagem ${active + 1}`} className="max-h-[60vh] w-full object-contain" />
          </div>
          {project.images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {project.images.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Ver imagem ${i + 1}`} className={`size-16 shrink-0 overflow-hidden rounded-lg border ${i === active ? "border-lime" : "border-line opacity-60"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-fog">
        <span className="rounded-full border border-line px-2.5 py-1" style={{ color: categoryById(project.category).color }}>
          {categoryById(project.category).label}
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">{STATUS.find((s) => s.id === project.status)?.label}</span>
        <span>Atualizado {relativeTime(project.updatedAt)}</span>
      </div>
      {project.description && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-paper/85">{project.description}</p>}
      {!!project.tags.length && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {project.tags.map((t) => (
            <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-fog">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-8 flex justify-between gap-2 border-t border-line pt-5">
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Excluir
        </Button>
        <Button size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" /> Editar
        </Button>
      </div>
    </div>
  );
}

function IdeaView({ idea }: { idea: SavedIdea }) {
  const i = idea.payload;
  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      <div className="flex h-2 overflow-hidden rounded-full">
        {i.palette.map((p) => (
          <span key={p.hex} className="flex-1" style={{ background: p.hex }} />
        ))}
      </div>
      <p className="text-paper/85">{i.concept}</p>
      <div>
        <p className="label mb-2">Ideias</p>
        <ul className="list-disc space-y-1 pl-5 text-paper/85">
          {i.ideas.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label mb-2">Direção de arte</p>
        <p className="text-paper/85">{i.artDirection}</p>
      </div>
      <div>
        <p className="label mb-2">Execução</p>
        <ol className="list-decimal space-y-1 pl-5 text-paper/85">
          {i.execution.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </div>
      {i.script && (
        <div>
          <p className="label mb-2">Roteiro</p>
          <ol className="space-y-1 font-mono text-[13px] text-paper/85">
            {i.script.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Portfolio() {
  const { data, deleteProject, deleteIdea } = useUserData();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<"projetos" | "ideias" | "evolucao">("projetos");
  const [cat, setCat] = useState<CategoryId | "todas">("todas");
  const [status, setStatus] = useState<Project["status"] | "todos">("todos");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "new" } | { mode: "edit"; project: Project } | { mode: "view"; id: string } | null>(null);
  const [ideaOpen, setIdeaOpen] = useState<SavedIdea | null>(null);

  useEffect(() => {
    if (params.get("novo")) setModal({ mode: "new" });
    const pid = params.get("projeto");
    if (pid && data.projects.some((p) => p.id === pid)) setModal({ mode: "view", id: pid });
    if (params.get("novo") || pid) router.replace("/portfolio", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.projects
      .filter((p) => cat === "todas" || p.category === cat)
      .filter((p) => status === "todos" || p.status === status)
      .filter((p) => !t || [p.title, p.description, ...p.tags].join(" ").toLowerCase().includes(t));
  }, [data.projects, cat, status, q]);

  const viewing = modal?.mode === "view" ? data.projects.find((p) => p.id === modal.id) : undefined;

  const timeline = useMemo(() => {
    const groups = new Map<string, Project[]>();
    for (const p of [...data.projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const k = new Date(p.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    return [...groups.entries()].reverse();
  }, [data.projects]);

  return (
    <>
      <PageHeader
        eyebrow="Meu portfólio"
        title="Tudo que você"
        accent="já criou."
        description="Registre projetos com imagens e descrições, guarde ideias do gerador e acompanhe sua evolução ao longo do tempo."
        actions={
          <Button onClick={() => setModal({ mode: "new" })}>
            <Plus className="size-4" /> Novo projeto
          </Button>
        }
      />

      <div role="tablist" aria-label="Seções do portfólio" className="mb-8 flex gap-1 border-b border-line">
        {(
          [
            ["projetos", `Projetos (${data.projects.length})`],
            ["ideias", `Ideias salvas (${data.ideas.length})`],
            ["evolucao", "Evolução"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative px-4 py-3 text-sm transition ${tab === id ? "text-paper" : "text-fog hover:text-paper"}`}
          >
            {label}
            {tab === id && <motion.span layoutId="pf-tab" className="absolute inset-x-2 -bottom-px h-0.5 bg-lime" />}
          </button>
        ))}
      </div>

      {tab === "projetos" && (
        <>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button className="chip" data-active={cat === "todas"} onClick={() => setCat("todas")}>
                Todas
              </button>
              {CATEGORIES.map((c) => (
                <button key={c.id} className="chip" data-active={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.short}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <select aria-label="Filtrar por status" className="field !w-auto !py-2" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="todos">Todos os status</option>
                {STATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <label className="relative block flex-1 md:w-60">
                <span className="sr-only">Buscar projetos</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
                <input type="search" className="field !rounded-full pl-11" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="size-5" />}
              title={data.projects.length ? "Nenhum projeto com esses filtros" : "Nenhum projeto ainda"}
              text={data.projects.length ? "Tente outra combinação." : "Crie seu primeiro projeto e comece a documentar sua evolução (+40 XP)."}
              action={
                !data.projects.length && (
                  <Button size="sm" onClick={() => setModal({ mode: "new" })}>
                    <Plus className="size-4" /> Criar projeto
                  </Button>
                )
              }
            />
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {list.map((p) => (
                  <motion.button
                    layout
                    key={p.id}
                    onClick={() => setModal({ mode: "view", id: p.id })}
                    className="card group overflow-hidden text-left transition hover:border-line-strong"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="hairline-grid grid h-full place-items-center">
                          <span className="display text-7xl" style={{ color: categoryById(p.category).color }}>
                            {p.title.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] backdrop-blur">
                        {STATUS.find((s) => s.id === p.status)?.label}
                      </span>
                      {p.images.length > 1 && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[11px]">+{p.images.length - 1}</span>}
                    </div>
                    <div className="p-5">
                      <p className="label !text-[10px]" style={{ color: categoryById(p.category).color }}>
                        {categoryById(p.category).label}
                      </p>
                      <h3 className="mt-2 font-display text-xl font-semibold leading-tight">{p.title}</h3>
                      {p.description && <p className="mt-2 line-clamp-2 text-sm text-fog">{p.description}</p>}
                      <p className="mt-4 text-xs text-mute">{relativeTime(p.updatedAt)}</p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      {tab === "ideias" &&
        (data.ideas.length === 0 ? (
          <EmptyState icon={<Bookmark className="size-5" />} title="Nenhuma ideia salva" text="Use o Gerador de ideias e salve as que quiser executar depois." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.ideas.map((i) => (
              <article key={i.id} className="card overflow-hidden">
                <div className="flex h-2">
                  {i.payload.palette.map((p) => (
                    <span key={p.hex} className="flex-1" style={{ background: p.hex }} />
                  ))}
                </div>
                <div className="p-5">
                  <p className="text-xs text-mute">{relativeTime(i.createdAt)}</p>
                  <h3 className="mt-1 font-display text-xl font-semibold">{i.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-fog">{i.payload.concept}</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIdeaOpen(i)}>
                      Ver ideia
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remover esta ideia?")) deleteIdea(i.id).catch(() => null);
                      }}
                      aria-label={`Remover ideia ${i.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}

      {tab === "evolucao" &&
        (timeline.length === 0 ? (
          <EmptyState icon={<FolderOpen className="size-5" />} title="Sua linha do tempo aparece aqui" text="Cada projeto criado vira um marco da sua evolução." />
        ) : (
          <ol className="relative space-y-10 border-l border-line pl-8">
            {timeline.map(([month, projects]) => (
              <li key={month}>
                <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-lime" aria-hidden />
                <p className="label mb-4 capitalize">
                  {month} · {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => setModal({ mode: "view", id: p.id })} className="card w-48 shrink-0 overflow-hidden text-left">
                      <div className="aspect-square bg-slate">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full place-items-center font-display text-4xl" style={{ color: categoryById(p.category).color }}>
                            {p.title[0]}
                          </div>
                        )}
                      </div>
                      <p className="truncate p-3 text-sm">{p.title}</p>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ))}

      <Modal
        open={modal?.mode === "new" || modal?.mode === "edit"}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Editar projeto" : "Novo projeto"}
        size="lg"
      >
        {(modal?.mode === "new" || modal?.mode === "edit") && (
          <ProjectForm
            key={modal.mode === "edit" ? modal.project.id : "new"}
            initial={modal.mode === "edit" ? modal.project : undefined}
            onDone={(p) => setModal(p ? { mode: "view", id: p.id } : null)}
          />
        )}
      </Modal>

      <Modal open={!!viewing} onClose={() => setModal(null)} title={viewing?.title ?? ""} size="xl">
        {viewing && (
          <ProjectView
            project={viewing}
            onEdit={() => setModal({ mode: "edit", project: viewing })}
            onDelete={async () => {
              if (!confirm(`Excluir “${viewing.title}”? Esta ação não pode ser desfeita.`)) return;
              await deleteProject(viewing.id).catch(() => null);
              setModal(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!ideaOpen} onClose={() => setIdeaOpen(null)} title={ideaOpen?.title ?? ""} size="lg">
        {ideaOpen && <IdeaView idea={ideaOpen} />}
      </Modal>
    </>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <Portfolio />
    </Suspense>
  );
}
