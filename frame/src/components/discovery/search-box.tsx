"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { History, Search, X } from "lucide-react";

const KEY = "frame:search-history";
const MAX = 8;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function write(v: string[]) {
  try {
    if (v.length) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* armazenamento indisponível: segue sem histórico */
  }
}

/** Busca por pessoas, projetos, legendas e #hashtags. O histórico fica só neste aparelho. */
export function SearchBox({ initial, category }: { initial: string; category: string | null }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [history, setHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Vindo do botão de busca do cabeçalho (#busca): já abre com o cursor no campo.
  useEffect(() => {
    if (window.location.hash === "#busca") inputRef.current?.focus();
  }, []);

  function go(term: string) {
    const t = term.trim().slice(0, 80);
    const params = new URLSearchParams();
    if (t) params.set("q", t);
    if (category) params.set("cat", category);
    if (t) {
      const next = [t, ...read().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
      write(next);
      setHistory(next);
    }
    setFocused(false);
    router.push(`/descobrir${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <label htmlFor="busca" className="sr-only">
          Buscar no FRAME
        </label>
        <div className="flex items-center gap-2 rounded-full bg-paper px-4 text-ink-950 ring-2 ring-transparent focus-within:ring-volt-500">
          <Search className="size-5 shrink-0 text-ink-600" aria-hidden />
          <input
            id="busca"
            ref={inputRef}
            name="q"
            type="search"
            value={q}
            maxLength={80}
            autoComplete="off"
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              setHistory(read());
              setFocused(true);
            }}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Pessoas, projetos, #hashtags…"
            className="h-12 w-full bg-transparent text-base text-ink-950 placeholder:text-ink-600 focus:outline-none"
          />
          {q ? (
            <button type="button" aria-label="Limpar busca" onClick={() => (setQ(""), go(""))} className="rounded-full p-1 text-ink-600 hover:bg-ink-950/10">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </form>
      {focused && history.length ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-[var(--radius-md)] bg-ink-850 p-2 shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fog-500">Buscas recentes</p>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                write([]);
                setHistory([]);
              }}
              className="text-xs text-fog-400 hover:text-paper"
            >
              Limpar histórico
            </button>
          </div>
          <ul>
            {history.map((h) => (
              <li key={h} className="flex items-center">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => (setQ(h), go(h))} className="flex flex-1 items-center gap-2 rounded-[var(--radius-xs)] px-2 py-2 text-left text-sm text-fog-200 hover:bg-white/5">
                  <History className="size-4 text-fog-500" aria-hidden /> {h}
                </button>
                <button
                  type="button"
                  aria-label={`Remover “${h}” do histórico`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const next = read().filter((x) => x !== h);
                    write(next);
                    setHistory(next);
                  }}
                  className="rounded-full p-1.5 text-fog-500 hover:text-paper"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
