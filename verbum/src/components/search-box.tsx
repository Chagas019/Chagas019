"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBox({ initial = "", size = "lg", placeholder = "Pesquise um tema, passagem, música, santo ou documento…", action = "/pesquisa" }: { initial?: string; size?: "lg" | "md"; placeholder?: string; action?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`${action}?q=${encodeURIComponent(q.trim())}`); }}
      className={`flex items-center gap-2 rounded-full border border-ivory-300 bg-white shadow-card focus-within:border-royal-300 focus-within:ring-4 focus-within:ring-royal-50 ${size === "lg" ? "p-2 pl-5" : "p-1.5 pl-4"}`}
    >
      <Search className="h-5 w-5 shrink-0 text-ink-mute" aria-hidden />
      <label htmlFor="busca-global" className="sr-only">Pesquisar</label>
      <input
        id="busca-global"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-mute/80 focus:outline-none ${size === "lg" ? "py-2 text-base" : "py-1.5 text-[15px]"}`}
        maxLength={200}
      />
      <button type="submit" className="rounded-full bg-royal-800 px-5 py-2 text-sm font-semibold text-ivory-50 hover:bg-royal-700">Buscar</button>
    </form>
  );
}
