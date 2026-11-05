"use client";

import { useMemo, useState } from "react";
import { Folder, Heart, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { REFERENCES, REFERENCE_KINDS } from "@/lib/content/references";
import { useUserData } from "@/lib/store";
import type { Reference, ReferenceKind } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/ui/bits";
import { ReferenceCard } from "@/components/references/ReferenceCard";
import { ReferenceModal } from "@/components/references/ReferenceModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type View = "biblioteca" | "favoritos" | string; // string = id da coleção

export default function ReferenciasPage() {
  const { data, createCollection, deleteCollection, renameCollection } = useUserData();
  const [view, setView] = useState<View>("biblioteca");
  const [kind, setKind] = useState<ReferenceKind | "todas">("todas");
  const [q, setQ] = useState("");
  const [openRef, setOpenRef] = useState<Reference | null>(null);
  const [colModal, setColModal] = useState<{ id?: string; name: string } | null>(null);

  const favSlugs = useMemo(() => new Set(data.favorites.map((f) => f.referenceSlug)), [data.favorites]);
  const activeCollection = data.collections.find((c) => c.id === view);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let base = REFERENCES;
    if (view === "favoritos") base = base.filter((r) => favSlugs.has(r.slug));
    else if (activeCollection) {
      const inCol = new Set(data.favorites.filter((f) => f.collectionId === activeCollection.id).map((f) => f.referenceSlug));
      base = base.filter((r) => inCol.has(r.slug));
    }
    return base
      .filter((r) => kind === "todas" || r.kind === kind)
      .filter((r) => !term || [r.title, r.description, r.author, ...r.tags].join(" ").toLowerCase().includes(term));
  }, [view, kind, q, favSlugs, activeCollection, data.favorites]);

  const countIn = (id: string) => data.favorites.filter((f) => f.collectionId === id).length;

  return (
    <>
      <PageHeader
        eyebrow="Laboratório de referências"
        title="Repertório é"
        accent="matéria-prima."
        description="Fotografias, cartazes, identidades, tipografias, paletas, campanhas e composições — cada uma com o insight que você pode levar para o seu trabalho."
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Navegação de coleções */}
        <aside aria-label="Coleções" className="lg:sticky lg:top-12 lg:self-start">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
            <button className="chip lg:justify-between" data-active={view === "biblioteca"} onClick={() => setView("biblioteca")}>
              Biblioteca <span className="opacity-60">{REFERENCES.length}</span>
            </button>
            <button className="chip lg:justify-between" data-active={view === "favoritos"} onClick={() => setView("favoritos")}>
              <span className="flex items-center gap-1.5">
                <Heart className="size-3.5" /> Favoritos
              </span>
              <span className="opacity-60">{data.favorites.length}</span>
            </button>
            {data.collections.map((c) => (
              <button key={c.id} className="chip lg:justify-between" data-active={view === c.id} onClick={() => setView(c.id)}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Folder className="size-3.5 shrink-0" /> <span className="truncate">{c.name}</span>
                </span>
                <span className="opacity-60">{countIn(c.id)}</span>
              </button>
            ))}
            <button className="chip border-dashed" onClick={() => setColModal({ name: "" })}>
              <Plus className="size-3.5" /> Nova coleção
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {activeCollection ? (
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">{activeCollection.name}</h2>
                  <button
                    onClick={() => setColModal({ id: activeCollection.id, name: activeCollection.name })}
                    className="grid size-8 place-items-center rounded-full text-fog hover:bg-white/10 hover:text-paper"
                    aria-label="Renomear coleção"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Excluir a coleção “${activeCollection.name}”? As referências continuam nos favoritos.`)) return;
                      await deleteCollection(activeCollection.id).catch(() => null);
                      setView("favoritos");
                    }}
                    className="grid size-8 place-items-center rounded-full text-fog hover:bg-ember/15 hover:text-ember"
                    aria-label="Excluir coleção"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div />
              )}
              <label className="relative block md:w-80">
                <span className="sr-only">Buscar referências</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por tema, autor, tag…" className="field !rounded-full pl-11" />
              </label>
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button className="chip" data-active={kind === "todas"} onClick={() => setKind("todas")}>
                Tudo
              </button>
              {REFERENCE_KINDS.map((k) => (
                <button key={k.id} className="chip" data-active={kind === k.id} onClick={() => setKind(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<Heart className="size-5" />}
              title={view === "biblioteca" ? "Nenhuma referência encontrada" : "Nada salvo aqui ainda"}
              text={
                view === "biblioteca"
                  ? "Tente outra busca ou outro tipo."
                  : "Toque no coração de uma referência para salvá-la. Abra a referência para organizá-la em coleções."
              }
              action={
                view !== "biblioteca" && (
                  <Button size="sm" variant="outline" onClick={() => setView("biblioteca")}>
                    Explorar a biblioteca
                  </Button>
                )
              }
            />
          ) : (
            <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
              {list.map((r) => (
                <ReferenceCard key={r.slug} reference={r} onOpen={setOpenRef} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ReferenceModal reference={openRef} onClose={() => setOpenRef(null)} />

      <Modal open={!!colModal} onClose={() => setColModal(null)} title={colModal?.id ? "Renomear coleção" : "Nova coleção"}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!colModal?.name.trim()) return;
            try {
              if (colModal.id) await renameCollection(colModal.id, colModal.name);
              else setView(await createCollection(colModal.name));
              setColModal(null);
            } catch {
              /* toast */
            }
          }}
        >
          <label htmlFor="col-name" className="block text-sm text-fog">
            Nome da coleção
          </label>
          <input
            id="col-name"
            className="field"
            maxLength={40}
            value={colModal?.name ?? ""}
            onChange={(e) => setColModal((c) => (c ? { ...c, name: e.target.value } : c))}
            placeholder="Ex.: Moodboard campanha verão"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setColModal(null)}>
              Cancelar
            </Button>
            <Button type="submit">{colModal?.id ? "Salvar" : "Criar coleção"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
