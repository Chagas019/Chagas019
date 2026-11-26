"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderPlus, Folder as FolderIcon, Trash2, FileText, StickyNote, Bookmark, History, Plus, CloudOff, Cloud, Sparkles, CalendarDays } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button, Card, Chip, EmptyState, ExtLink, Notice, PageHeader, inputCls } from "@/components/ui/primitives";
import type { Folder, HistoryEntry, Note, Project, ProjectKind, SavedItem, SavedKind } from "@/lib/store/types";

type Tab = "projetos" | "salvos" | "notas" | "historico";
const KIND_LABEL: Record<SavedKind, string> = { song: "Música", source: "Documento", sermon: "Pregação", preacher: "Pregador", bible: "Bíblia", catechism: "Catecismo", saint: "Santo", video: "Vídeo", link: "Tema" };
const PROJECT_KIND: Record<ProjectKind, string> = { pregacao: "Pregação", encontro: "Encontro", retiro: "Retiro", formacao: "Formação", estudo: "Estudo bíblico", "grupo-de-oracao": "Grupo de oração" };
const STATUS: Record<Project["status"], string> = { rascunho: "Rascunho", pronto: "Pronto", realizado: "Realizado" };

export function SpaceView() {
  const { store, user, supabaseConfigured, authReady, refreshSaved, toast } = useApp();
  const [tab, setTab] = useState<Tab>("projetos");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [kindFilter, setKindFilter] = useState<SavedKind | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [editing, setEditing] = useState<Partial<Note> | null>(null);
  const [newProject, setNewProject] = useState<{ title: string; kind: ProjectKind; event_date: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [f, s, n, p, h] = await Promise.all([store.listFolders(), store.listSaved(), store.listNotes(), store.listProjects(), store.listHistory(50)]);
      setFolders(f); setSaved(s); setNotes(n); setProjects(p); setHistory(h);
    } catch (e) { toast(`Erro ao carregar: ${(e as Error).message}`); }
  }, [store, toast]);

  useEffect(() => { if (authReady) load(); }, [authReady, load]);

  const inFolder = <T extends { folder_id?: string | null }>(list: T[]) => (folder ? list.filter((x) => x.folder_id === folder) : list);
  const savedShown = useMemo(() => inFolder(saved).filter((s) => !kindFilter || s.kind === kindFilter), [saved, folder, kindFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolder.trim()) return;
    await store.addFolder(newFolder.trim()); setNewFolder(""); load(); toast("Pasta criada");
  }
  async function removeFolder(id: string) {
    if (!confirm("Excluir a pasta? Os itens dentro dela não serão apagados.")) return;
    await store.removeFolder(id); if (folder === id) setFolder(null); load();
  }
  async function saveNote() {
    if (!editing) return;
    await store.saveNote({ ...editing, title: editing.title?.trim() || "Sem título", body: editing.body ?? "", folder_id: editing.folder_id ?? folder });
    setEditing(null); load(); toast("Anotação salva");
  }
  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProject?.title.trim()) return;
    await store.saveProject({ title: newProject.title.trim(), kind: newProject.kind, event_date: newProject.event_date || null, folder_id: folder, brief: {}, content: null });
    setNewProject(null); load(); toast("Projeto criado");
  }

  const tabs: [Tab, string, React.ComponentType<{ className?: string }>, number][] = [
    ["projetos", "Pregações e projetos", FileText, projects.length],
    ["salvos", "Salvos", Bookmark, saved.length],
    ["notas", "Anotações", StickyNote, notes.length],
    ["historico", "Pesquisas", History, history.length],
  ];

  return (
    <div>
      <PageHeader eyebrow="Meu Espaço" title="Sua sala de preparação" description="Pregações, encontros, retiros, referências e anotações organizados em pastas." />

      {supabaseConfigured ? (user ? (
        <p className="mb-6 flex items-center gap-2 text-sm text-ink-soft"><Cloud className="h-4 w-4 text-emerald-700" /> Sincronizado com sua conta ({user.email}).</p>
      ) : (
        <div className="mb-6"><Notice title="Você não entrou na sua conta">Os itens abaixo estão salvos apenas neste navegador. <Link href="/entrar?voltar=/meu-espaco" className="font-semibold underline">Entre</Link> para guardá-los com segurança na nuvem e acessá-los em outros aparelhos.</Notice></div>
      )) : (
        <div className="mb-6"><Notice tone="warn" title="Modo local"><span className="inline-flex items-center gap-1"><CloudOff className="h-4 w-4" /> O banco de dados ainda não foi configurado neste servidor.</span> Seus itens ficam salvos neste navegador; limpar os dados do navegador os apaga.</Notice></div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Pastas" className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-mute">Pastas</p>
          <ul className="space-y-1">
            <li><button onClick={() => setFolder(null)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${!folder ? "bg-royal-800 text-ivory-50" : "hover:bg-white"}`}><FolderIcon className="h-4 w-4" /> Tudo</button></li>
            {folders.map((f) => (
              <li key={f.id} className="group flex items-center">
                <button onClick={() => setFolder(f.id)} className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${folder === f.id ? "bg-royal-800 text-ivory-50" : "hover:bg-white"}`}><FolderIcon className="h-4 w-4" /> {f.name}</button>
                <button onClick={() => removeFolder(f.id)} aria-label={`Excluir pasta ${f.name}`} className="rounded p-1.5 text-ink-mute opacity-0 hover:text-wine-500 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addFolder} className="mt-3 flex gap-2">
            <label htmlFor="nova-pasta" className="sr-only">Nova pasta</label>
            <input id="nova-pasta" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} maxLength={60} placeholder="Nova pasta" className={`${inputCls} py-2 text-sm`} />
            <button aria-label="Criar pasta" className="rounded-xl bg-royal-800 px-3 text-ivory-50 hover:bg-royal-700"><FolderPlus className="h-4 w-4" /></button>
          </form>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist">
            {tabs.map(([id, label, Icon, count]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tab === id ? "bg-royal-800 text-ivory-50" : "bg-white/70 text-ink-soft hover:bg-white"}`}>
                <Icon className="h-4 w-4" /> {label} <span className="opacity-70">{count}</span>
              </button>
            ))}
          </div>

          {tab === "projetos" && (
            <section role="tabpanel">
              <div className="mb-4 flex flex-wrap gap-2">
                <Link href="/assistente" className="inline-flex items-center gap-2 rounded-full bg-royal-800 px-4 py-2 text-sm font-semibold text-ivory-50 hover:bg-royal-700"><Sparkles className="h-4 w-4 text-gold-300" /> Nova pregação</Link>
                <Button variant="ghost" className="py-2" onClick={() => setNewProject({ title: "", kind: "retiro", event_date: "" })}><Plus className="h-4 w-4" /> Novo encontro ou retiro</Button>
              </div>
              {newProject && (
                <form onSubmit={createProject} className="mb-5 grid gap-3 rounded-2xl border border-ivory-300 bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <input required aria-label="Título do projeto" autoFocus className={inputCls} placeholder="ex.: Retiro de jovens — Quaresma" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
                  <select aria-label="Tipo" className={inputCls} value={newProject.kind} onChange={(e) => setNewProject({ ...newProject, kind: e.target.value as ProjectKind })}>{Object.entries(PROJECT_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <input aria-label="Data" type="date" className={inputCls} value={newProject.event_date} onChange={(e) => setNewProject({ ...newProject, event_date: e.target.value })} />
                  <div className="flex gap-2"><Button type="submit" className="py-2">Criar</Button><Button type="button" variant="ghost" className="py-2" onClick={() => setNewProject(null)}>Cancelar</Button></div>
                </form>
              )}
              {inFolder(projects).length ? (
                <ul className="grid gap-4 md:grid-cols-2">
                  {inFolder(projects).map((p) => (
                    <li key={p.id}><Card className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{PROJECT_KIND[p.kind]}</p>
                          <h3 className="font-serif text-lg text-royal-900">{p.title}</h3>
                        </div>
                        <select aria-label="Situação" value={p.status} onChange={async (e) => { await store.saveProject({ id: p.id, title: p.title, status: e.target.value as Project["status"] }); load(); }} className="rounded-full border border-ivory-300 bg-white px-2 py-1 text-xs">
                          {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-ink-mute">
                        {p.event_date && <><CalendarDays className="h-3.5 w-3.5" /> {new Date(p.event_date + "T12:00:00").toLocaleDateString("pt-BR")} ·</>}
                        Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-ink-mute">{notes.filter((n) => n.project_id === p.id).length} anotação(ões) vinculada(s)</p>
                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                        {p.content ? <Link href={`/assistente?projeto=${p.id}`} className="text-sm font-medium text-royal-700 hover:underline">Abrir roteiro</Link>
                          : <Link href={`/assistente?tema=${encodeURIComponent(p.title)}`} className="text-sm font-medium text-royal-700 hover:underline">Preparar pregação para este projeto</Link>}
                        <button onClick={() => { setTab("notas"); setEditing({ title: `Notas — ${p.title}`, body: "", project_id: p.id }); }} className="text-sm text-royal-700 hover:underline">Anotar</button>
                        <select aria-label="Mover para pasta" value={p.folder_id ?? ""} onChange={async (e) => { await store.saveProject({ id: p.id, title: p.title, folder_id: e.target.value || null }); load(); }} className="rounded-full border border-ivory-300 bg-white px-2 py-1 text-xs">
                          <option value="">Sem pasta</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={async () => { if (confirm(`Excluir “${p.title}”?`)) { await store.removeProject(p.id); load(); } }} aria-label={`Excluir ${p.title}`} className="ml-auto rounded p-1 text-ink-mute hover:text-wine-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </Card></li>
                  ))}
                </ul>
              ) : <EmptyState icon={<FileText className="h-8 w-8" />} title="Nenhum projeto aqui">Prepare uma pregação com o assistente ou crie o projeto de um encontro ou retiro.</EmptyState>}
            </section>
          )}

          {tab === "salvos" && (
            <section role="tabpanel">
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                <Chip active={!kindFilter} onClick={() => setKindFilter(null)}>Todos</Chip>
                {(Object.keys(KIND_LABEL) as SavedKind[]).filter((k) => saved.some((s) => s.kind === k)).map((k) => <Chip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>{KIND_LABEL[k]}</Chip>)}
              </div>
              {savedShown.length ? (
                <ul className="divide-y divide-ivory-200 overflow-hidden rounded-2xl border border-ivory-300/70 bg-white">
                  {savedShown.map((s) => (
                    <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{KIND_LABEL[s.kind]}</p>
                        <p className="truncate font-medium text-royal-900">{s.title}</p>
                        {s.subtitle && <p className="truncate text-sm text-ink-mute">{s.subtitle}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {s.url && (s.url.startsWith("/") ? <Link href={s.url} className="text-sm text-royal-700 hover:underline">Abrir</Link> : <ExtLink href={s.url}>Abrir</ExtLink>)}
                        <select aria-label="Mover para pasta" value={s.folder_id ?? ""} onChange={async (e) => { await store.moveSaved(s.id, e.target.value || null); load(); }} className="rounded-full border border-ivory-300 bg-white px-2 py-1 text-xs">
                          <option value="">Sem pasta</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button aria-label={`Remover ${s.title}`} onClick={async () => { await store.unsave(s.kind, s.ref_id); await refreshSaved(); load(); }} className="rounded p-1 text-ink-mute hover:text-wine-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon={<Bookmark className="h-8 w-8" />} title="Nada salvo aqui">Use o botão “Salvar” em músicas, documentos, passagens e pregações.</EmptyState>}
            </section>
          )}

          {tab === "notas" && (
            <section role="tabpanel">
              {editing ? (
                <div className="mb-6 space-y-3 rounded-2xl border border-ivory-300 bg-white p-5">
                  <input aria-label="Título da anotação" className={`${inputCls} font-serif text-lg`} value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Título" maxLength={160} />
                  <textarea aria-label="Texto da anotação" className={`${inputCls} min-h-[220px]`} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Inspirações, testemunhos, ideias para a pregação…" maxLength={50000} />
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Vincular a projeto" value={editing.project_id ?? ""} onChange={(e) => setEditing({ ...editing, project_id: e.target.value || null })} className="rounded-full border border-ivory-300 bg-white px-3 py-2 text-sm">
                      <option value="">Sem projeto</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <select aria-label="Pasta" value={editing.folder_id ?? folder ?? ""} onChange={(e) => setEditing({ ...editing, folder_id: e.target.value || null })} className="rounded-full border border-ivory-300 bg-white px-3 py-2 text-sm">
                      <option value="">Sem pasta</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <div className="ml-auto flex gap-2"><Button variant="ghost" className="py-2" onClick={() => setEditing(null)}>Cancelar</Button><Button className="py-2" onClick={saveNote}>Salvar anotação</Button></div>
                  </div>
                </div>
              ) : <Button className="mb-4 py-2" onClick={() => setEditing({ title: "", body: "", folder_id: folder })}><Plus className="h-4 w-4" /> Nova anotação</Button>}
              {inFolder(notes).length ? (
                <ul className="grid gap-4 md:grid-cols-2">
                  {inFolder(notes).map((n) => (
                    <li key={n.id}><Card className="flex h-full flex-col gap-2">
                      <h3 className="font-serif text-lg text-royal-900">{n.title}</h3>
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink-soft">{n.body || "—"}</p>
                      {n.project_id && <p className="text-xs text-gold-700">Projeto: {projects.find((p) => p.id === n.project_id)?.title ?? "—"}</p>}
                      <div className="mt-auto flex items-center gap-3 pt-2 text-sm">
                        <span className="text-xs text-ink-mute">{new Date(n.updated_at).toLocaleDateString("pt-BR")}</span>
                        <button className="ml-auto text-royal-700 hover:underline" onClick={() => setEditing(n)}>Editar</button>
                        <button aria-label={`Excluir ${n.title}`} onClick={async () => { if (confirm("Excluir anotação?")) { await store.removeNote(n.id); load(); } }} className="rounded p-1 text-ink-mute hover:text-wine-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </Card></li>
                  ))}
                </ul>
              ) : !editing && <EmptyState icon={<StickyNote className="h-8 w-8" />} title="Nenhuma anotação">Guarde aqui inspirações, testemunhos e ideias.</EmptyState>}
            </section>
          )}

          {tab === "historico" && (
            <section role="tabpanel">
              {history.length ? (
                <>
                  <ul className="divide-y divide-ivory-200 overflow-hidden rounded-2xl border border-ivory-300/70 bg-white">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <Link href={h.scope === "pregacoes" ? `/pregacoes?q=${encodeURIComponent(h.query)}` : `/pesquisa?q=${encodeURIComponent(h.query)}`} className="flex-1 font-medium text-royal-900 hover:underline">{h.query}</Link>
                        <span className="text-xs text-ink-mute">{h.scope === "pregacoes" ? "Pregações" : `${h.results_count} resultados`}</span>
                        <span className="text-xs text-ink-mute">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" className="mt-4 py-2" onClick={async () => { if (confirm("Apagar todo o histórico de pesquisas?")) { await store.clearHistory(); load(); } }}><Trash2 className="h-4 w-4" /> Limpar histórico</Button>
                </>
              ) : <EmptyState icon={<History className="h-8 w-8" />} title="Sem pesquisas ainda" />}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
