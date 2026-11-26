"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useApp } from "@/components/providers";
import type { SavedItem } from "@/lib/store/types";

export function SaveButton({ item, compact = false }: { item: Omit<SavedItem, "id" | "created_at">; compact?: boolean }) {
  const { isSaved, toggleSaved } = useApp();
  const saved = isSaved(item.kind, item.ref_id);
  return (
    <button
      type="button"
      onClick={() => toggleSaved(item)}
      aria-pressed={saved}
      aria-label={saved ? `Remover “${item.title}” do Meu Espaço` : `Salvar “${item.title}” no Meu Espaço`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        saved ? "border-gold-500 bg-gold-100 text-gold-700" : "border-ivory-300 text-ink-soft hover:border-royal-300 hover:text-royal-700"
      }`}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {!compact && (saved ? "Salvo" : "Salvar")}
    </button>
  );
}
