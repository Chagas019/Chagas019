"use client";

import { useState } from "react";
import { Copy, FolderPlus, Lightbulb, Plus } from "lucide-react";
import type { Reference } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { RefArt } from "@/components/art/RefArt";
import { REFERENCE_KINDS } from "@/lib/content/references";
import { useApp } from "@/lib/store";
import { FavoriteButton } from "./ReferenceCard";
import { Button } from "@/components/ui/Button";

export function ReferenceModal({ reference, onClose }: { reference: Reference | null; onClose: () => void }) {
  const { data, moveFavorite, createCollection, toast } = useApp();
  const [newName, setNewName] = useState("");
  const fav = reference ? data?.favorites.find((f) => f.referenceSlug === reference.slug) : undefined;

  return (
    <Modal open={!!reference} onClose={onClose} title={reference?.title ?? ""} size="xl" hideTitle>
      {reference && (
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <RefArt {...reference} className="aspect-[4/5] h-full w-full md:aspect-auto" />
            <FavoriteButton slug={reference.slug} className="absolute right-3 top-3" />
          </div>
          <div className="flex flex-col">
            <p className="label">{REFERENCE_KINDS.find((k) => k.id === reference.kind)?.label}</p>
            <h2 className="display mt-3 text-4xl">{reference.title}</h2>
            <p className="mt-2 text-sm text-mute">
              {reference.author} · {reference.year}
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-paper/85">{reference.description}</p>

            <div className="mt-6 rounded-2xl border border-lime/25 bg-lime/[0.06] p-4">
              <p className="label mb-2 flex items-center gap-1.5 !text-lime">
                <Lightbulb className="size-3.5" /> O que levar disso
              </p>
              <p className="text-sm leading-relaxed">{reference.insight}</p>
            </div>

            <div className="mt-6">
              <p className="label mb-3">Paleta</p>
              <div className="flex flex-wrap gap-2">
                {reference.palette.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => {
                      navigator.clipboard?.writeText(hex).then(
                        () => toast(`${hex.toUpperCase()} copiado.`),
                        () => toast("Não foi possível copiar.", "error"),
                      );
                    }}
                    className="group flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-xs transition hover:border-line-strong"
                    aria-label={`Copiar cor ${hex}`}
                  >
                    <span className="size-6 rounded-full border border-white/10" style={{ background: hex }} />
                    <span className="font-mono">{hex.toUpperCase()}</span>
                    <Copy className="size-3 text-mute opacity-0 transition group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {reference.tags.map((t) => (
                <span key={t} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-fog">
                  #{t}
                </span>
              ))}
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <p className="label mb-3 flex items-center gap-1.5">
                <FolderPlus className="size-3.5" /> Coleção
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  className="chip"
                  data-active={!!fav && fav.collectionId === null}
                  onClick={() => moveFavorite(reference.slug, null).catch(() => null)}
                >
                  Só favoritos
                </button>
                {data?.collections.map((c) => (
                  <button
                    key={c.id}
                    className="chip"
                    data-active={fav?.collectionId === c.id}
                    onClick={() => moveFavorite(reference.slug, c.id).catch(() => null)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  try {
                    const id = await createCollection(newName);
                    await moveFavorite(reference.slug, id);
                    setNewName("");
                  } catch {
                    /* toast */
                  }
                }}
              >
                <label htmlFor="new-col" className="sr-only">
                  Nova coleção
                </label>
                <input id="new-col" className="field !py-2 text-sm" placeholder="Nova coleção…" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} />
                <Button type="submit" variant="outline" size="sm" className="!h-10 shrink-0">
                  <Plus className="size-3.5" /> Criar
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
