"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { toggleSaveAction } from "@/server/actions/social";

/** Salva o post em uma coleção (também o marca como salvo). */
export function CollectionPicker({ postId, collections }: { postId: string; collections: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  if (!collections.length) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-fog-400">
      <span className="sr-only">Adicionar à coleção</span>
      <select
        disabled={pending}
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          start(async () => {
            const r = await toggleSaveAction(postId, id);
            toast.show(r.ok ? `Adicionado a “${collections.find((c) => c.id === id)?.name}”.` : r.error, r.ok ? "success" : "error");
          });
          e.target.value = "";
        }}
        className="h-9 rounded-full bg-transparent px-3 text-sm text-fog-300 ring-1 ring-inset ring-ink-700 hover:ring-ink-600 focus:outline-none focus:ring-volt-500"
      >
        <option value="">+ Coleção</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
