"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: string };

/**
 * Filtros do marketplace. Tudo vive na URL (compartilhável, funciona com voltar/avançar).
 * Sem JavaScript, o formulário GET continua funcionando.
 */
export function FilterBar({ categories, total }: { categories: Cat[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === null || v === "" ? next.delete(k) : next.set(k, v));
    const s = next.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const go = (patch: Record<string, string | null>) => start(() => router.replace(href(patch), { scroll: false }));

  const access = sp.get("acesso");
  const cat = sp.get("categoria");
  const sort = sp.get("ordem") ?? "recent";
  const active = !!(access || cat || sp.get("q") || sp.get("ordem"));

  const chip = (label: string, isOn: boolean, patch: Record<string, string | null>, testId?: string) => (
    <Link
      key={label}
      href={href(patch)}
      replace
      scroll={false}
      aria-pressed={isOn}
      data-testid={testId}
      className={cn("lab-label inline-flex h-10 shrink-0 items-center rounded-full border px-4 transition", isOn ? "border-signal bg-signal text-signal-ink" : "border-bone/15 text-ash hover:border-bone/50 hover:text-bone")}
    >
      {label}
    </Link>
  );

  return (
    <form
      id="busca"
      role="search"
      action={pathname}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: q.trim() || null });
      }}
      className="scroll-mt-28 space-y-4"
    >
      {access && <input type="hidden" name="acesso" value={access} />}
      {cat && <input type="hidden" name="categoria" value={cat} />}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar presets</span>
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-smoke" aria-hidden />
          <input
            type="search"
            name="q"
            value={q}
            maxLength={80}
            placeholder="Buscar por nome, estilo ou clima…"
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go({ q: v.trim() || null }), 350);
            }}
            className="h-14 w-full rounded-full border border-bone/15 bg-graphite pl-14 pr-12 text-[16px] placeholder:text-smoke focus:border-signal focus:outline-none"
          />
          {pending && <Loader2 className="absolute right-5 top-1/2 size-5 -translate-y-1/2 animate-spin text-smoke" aria-label="Carregando" />}
        </label>
        <label className="flex items-center gap-3">
          <span className="lab-label shrink-0 text-smoke">Ordenar</span>
          <select name="ordem" value={sort} onChange={(e) => go({ ordem: e.target.value === "recent" ? null : e.target.value })} className="h-14 flex-1 appearance-none rounded-full border border-bone/15 bg-graphite px-5 text-[15px] focus:border-signal focus:outline-none md:w-52" data-testid="sort-select">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <noscript>
          <button className="h-14 rounded-full bg-bone px-6 text-ink">Filtrar</button>
        </noscript>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" aria-label="Tipo de acesso">
        {chip("Todos", !access, { acesso: null })}
        {chip("Gratuitos", access === "free", { acesso: access === "free" ? null : "free" }, "filter-free")}
        {chip("Premium", access === "premium", { acesso: access === "premium" ? null : "premium" }, "filter-premium")}
        {chip("Mais populares", sort === "popular", { ordem: sort === "popular" ? null : "popular" })}
        {chip("Lançamentos", sort === "recent" && !!sp.get("ordem"), { ordem: "recent" })}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" aria-label="Categorias">
        {categories.map((c) => chip(c.name, cat === c.slug, { categoria: cat === c.slug ? null : c.slug }, `filter-cat-${c.slug}`))}
      </div>

      <div className="flex items-center justify-between border-t hairline pt-4">
        <p className="lab-label text-smoke" aria-live="polite" data-testid="result-count">
          {total} {total === 1 ? "preset" : "presets"}
        </p>
        {active && (
          <Link href={pathname} replace scroll={false} className="lab-label inline-flex items-center gap-1.5 text-bone/80 hover:text-signal">
            <X className="size-3.5" aria-hidden /> Limpar filtros
          </Link>
        )}
      </div>
    </form>
  );
}
